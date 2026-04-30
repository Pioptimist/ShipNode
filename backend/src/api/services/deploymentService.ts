import crypto from "crypto";
import { eq } from "drizzle-orm";
import { db } from "../../db/index.js";
import { projects, deployments } from "../../db/schema.js";
import { ENV } from "../../lib/env.js";
import axios from "axios";
import { deployQueue } from "../../lib/queue.js"; // <-- ADDED THIS IMPORT
import { S3Client, ListObjectsV2Command, DeleteObjectsCommand } from "@aws-sdk/client-s3";

const s3Client = new S3Client({
    region: "auto",
    endpoint: ENV.R2_ENDPOINT,
    credentials: {
        accessKeyId: ENV.R2_ACCESS_KEY_ID,
        secretAccessKey: ENV.R2_SECRET_ACCESS_KEY
    }
});

export const createGithubWebhook = async (
  githubToken: string, 
  repoOwner: string, 
  repoName: string
) => {
  // 1. Where should GitHub send the payload? (Must be an ngrok URL for local testing!)
  const webhookUrl = `${ENV.WEBHOOK_PROXY_URL}/api/webhooks/github`;

  try {
    const response = await axios.post(
      `https://api.github.com/repos/${repoOwner}/${repoName}/hooks`,
      {
        name: "web",
        active: true,
        events: ["push"], // We only care about code pushes
        config: {
          url: webhookUrl,
          content_type: "json",
          insecure_ssl: "0", 
          secret: ENV.GITHUB_WEBHOOK_SECRET // We lock the webhook with the secret we just made
        }
      },
      {
        headers: {
          Authorization: `Bearer ${githubToken}`, // <-- Just pass it straight to Axios
          Accept: "application/vnd.github.v3+json"
        }
      }
    );

    return response.data;
  } catch (error: any) {
    // If the user already deployed this repo before, the webhook already exists.
    // GitHub throws a 422 error. We catch it and say "All good!"
    if (error.response?.status === 422) {
      console.log(`Webhook already exists for ${repoOwner}/${repoName}. Skipping creation.`);
      return { message: "Webhook already exists" };
    }
    
    throw new Error(`Failed to create GitHub webhook: ${error.response?.data?.message || error.message}`);
  }
};
/**
 * 1. The Cryptography Service
 * Verifies that the webhook payload actually came from GitHub and wasn't spoofed.
 */
export const verifyWebhookSignature = (rawBody: Buffer | string, signature: string | undefined): boolean => {
  if (!signature || !rawBody) return false;

  // GitHub hashes the exact raw body using the secret you provided when creating the webhook
  const hmac = crypto.createHmac("sha256", ENV.GITHUB_WEBHOOK_SECRET);
  const digest = "sha256=" + hmac.update(rawBody).digest("hex");
  
  // We use timingSafeEqual to prevent timing attacks (hackers measuring how long the comparison takes)
  try {
    return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(digest));
  } catch (e) {
    // Fails safely if the buffer lengths don't match
    return false; 
  }
};

export const queueNewDeployment = async (
  repoFullName: string, 
  branch: string, 
  commitHash: string, 
  commitMessage: string
) => {
  const matchingProjects = await db.select().from(projects).where(eq(projects.repoName, repoFullName));

  if (matchingProjects.length === 0) {
    throw new Error(`Project not found in Shipnode for repo: ${repoFullName}`);
  }

  const queuedDeployments = [];

  for (const project of matchingProjects) {
    
    const isProduction = branch === project.productionBranch;
    let previewUrl = null;

    if (!isProduction) {
      const shortHash = crypto.randomBytes(3).toString("hex");
      const safeBranchName = branch.replace(/[^a-z0-9]/g, '-');
      // e.g., "ecommerce-feat-login-9a8b"
      previewUrl = `${project.name.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${safeBranchName}-${shortHash}`;
    }

    // 2a. Save to Database
    const [newDeployment] = await db.insert(deployments).values({
      projectId: project.id,
      branch: branch,
      commitHash: commitHash,
      commitMessage: commitMessage,
      status: "QUEUED",
      previewUrl: previewUrl 
    }).returning();
    
    // 2b. Push EXACT job data to BullMQ
    await deployQueue.add("deploy-job", {
      projectId: project.id,
      deploymentId: newDeployment.id,
      repoUrl: `https://github.com/${repoFullName}`,
      commitHash: commitHash,
      rootDir: project.rootDirectory || "/", 
      installCmd: project.installCommand || "npm install",
      buildCmd: project.buildCommand || "npm run build",
      isProduction: isProduction, // Tell the worker how to handle the aftermath
    
    });

    queuedDeployments.push(newDeployment);
  }

  return queuedDeployments;
};


export const deleteGithubWebhook = async (
  githubToken: string, 
  repoOwner: string, 
  repoName: string
) => {
  const targetUrl = `${ENV.WEBHOOK_PROXY_URL}/api/webhooks/github`;

  try {
    const { data: hooks } = await axios.get(
      `https://api.github.com/repos/${repoOwner}/${repoName}/hooks`,
      {
        headers: {
          Authorization: `Bearer ${githubToken}`,
          Accept: "application/vnd.github.v3+json"
        }
      }
    );

    const shipnodeHook = hooks.find((hook: any) => hook.config.url === targetUrl);

    if (shipnodeHook) {
      await axios.delete(
        `https://api.github.com/repos/${repoOwner}/${repoName}/hooks/${shipnodeHook.id}`,
        {
          headers: {
            Authorization: `Bearer ${githubToken}`,
            Accept: "application/vnd.github.v3+json"
          }
        }
      );
      console.log(`Successfully removed Shipnode webhook from ${repoOwner}/${repoName}`);
    }
  } catch (error: any) {
    // 🚨 Extract the exact GitHub API error message
    const errorMsg = error.response?.data?.message || error.message;
    console.error(`Failed to clean up webhook for ${repoName}:`, errorMsg);
    
    // 🚨 THROW the error so the controller catches it!
    throw new Error(`GitHub API Error: ${errorMsg}`); 
  }
};




/**
 * Recursively deletes all files in an R2 bucket under a specific prefix (folder)
 */
export const deleteR2Directory = async (prefix: string) => {
  if (!prefix) return;

  try {
    let isTruncated = true;
    let continuationToken: string | undefined;

    while (isTruncated) {
      // 1. Find all files inside this folder
      const listParams = {
        Bucket: ENV.R2_BUCKET_NAME,
        Prefix: prefix,
        ContinuationToken: continuationToken,
      };
      
      const listResponse = await s3Client.send(new ListObjectsV2Command(listParams));

      // If we found files, bulk delete them!
      if (listResponse.Contents && listResponse.Contents.length > 0) {
        const deleteParams = {
          Bucket: ENV.R2_BUCKET_NAME,
          Delete: {
            Objects: listResponse.Contents.map((file) => ({ Key: file.Key })),
          },
        };
        await s3Client.send(new DeleteObjectsCommand(deleteParams));
      }

      isTruncated = listResponse.IsTruncated ?? false;
      continuationToken = listResponse.NextContinuationToken;
    }
    console.log(`Successfully deleted R2 directory: ${prefix}`);
  } catch (error) {
    console.error(`Failed to delete R2 directory ${prefix}:`, error);
    throw error; // We throw so the controller knows it failed
  }
};