import crypto from "crypto";
import { eq } from "drizzle-orm";
import { db } from "../../db/index.js";
import { projects, deployments } from "../../db/schema.js";
import { ENV } from "../../lib/env.js";
import axios from "axios";

import { decryptToken } from "../../utils/crypto.js"; // Your decryption function

export const createGithubWebhook = async (
  encryptedGithubToken: string, 
  repoOwner: string, 
  repoName: string
) => {
  // 1. Decrypt the token so we can talk to GitHub
  const githubToken = decryptToken(encryptedGithubToken);

  // 2. Where should GitHub send the payload? (Must be an ngrok URL for local testing!)
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
          Authorization: `Bearer ${githubToken}`,
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

/**
 * 2. The Database Service
 * Finds the project and queues a new deployment.
 */
export const queueNewDeployment = async (
  repoFullName: string, 
  branch: string, 
  commitHash: string, 
  commitMessage: string
) => {
  // 1. Look up ALL projects in Shipnode using the GitHub repo name (e.g., "soumyodeep/ecommerce")
  const matchingProjects = await db.select().from(projects).where(eq(projects.repoName, repoFullName));

  if (matchingProjects.length === 0) {
    throw new Error(`Project not found in Shipnode for repo: ${repoFullName}`);
  }

  const queuedDeployments = [];

  // 2. Insert the new deployment into the database queue for EACH matching project
  for (const project of matchingProjects) {
    const [newDeployment] = await db.insert(deployments).values({
      projectId: project.id,
      branch: branch,
      commitHash: commitHash,
      commitMessage: commitMessage,
      status: "QUEUED",
    }).returning();
    queuedDeployments.push(newDeployment);
  }

  return queuedDeployments; // Return the array of deployments
};