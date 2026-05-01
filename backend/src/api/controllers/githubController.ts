import { Request, Response } from "express";
import { AuthRequest } from "../middleware/authMiddleware.js";
import { db } from "../../db/index.js";
import { eq } from "drizzle-orm"; // added eq import
import { users, projects, projectEnvs } from "../../db/schema.js";
import { createGithubWebhook,verifyWebhookSignature, queueNewDeployment } from "../services/deploymentService.js";
import crypto from "crypto";
import axios from "axios";
import { decryptToken } from "../../utils/crypto.js";
import { fetchRepoContentsService, fetchRepoBranchesService } from "../services/githubService.js";
import { encryptToken } from "../../utils/crypto.js"; 
export const getUserRepositories = async (req: AuthRequest, res: Response) => {
  try {
    const userPayload = req.user;
    if (!userPayload) {
        return res.status(401).json({ message: "Unauthorized" });
    }
    const [dbUser] = await db.select().from(users).where(eq(users.id, userPayload.id));
    if (!dbUser || !dbUser.githubAccessToken) {
        return res.status(403).json({ message: "GitHub token missing or expired. Please re-authenticate." });
    }

    const githubToken = decryptToken(dbUser.githubAccessToken);

    // Fetch the 100 most recently updated repos
    const response = await axios.get("https://api.github.com/user/repos", {
      headers: {
        Authorization: `Bearer ${githubToken}`,
        Accept: "application/vnd.github.v3+json",
      },
      params: {
        sort: "updated",
        per_page: 100,
      }
    });

    // Strip out the 90% of junk data GitHub sends back that we don't need
    const cleanRepos = response.data.map((repo: any) => ({
      id: repo.id,
      name: repo.name,
      owner: repo.owner.login,
      fullName: repo.full_name,
      private: repo.private,
      updatedAt: repo.updated_at,
      language: repo.language, // e.g., "TypeScript"
    }));

    return res.status(200).json({ success: true, data: cleanRepos });

  } catch (error) {
    console.error("Fetch Repos Error:", error);
    return res.status(500).json({ message: "Failed to fetch GitHub repositories." });
  }
};

export const createProject = async (req: AuthRequest, res: Response) => {
  try {
    const userPayload = req.user; 
    if (!userPayload) {
        return res.status(401).json({ message: "Unauthorized: Please log in." });
    }
    
    const { 
      repoOwner, 
      repoName, 
      branch = "main", 
      framework = "VITE", 
      rootDirectory = "/", 
      installCommand = "npm install", 
      buildCommand = "npm run build", 
      outputDirectory = "dist" 
    } = req.body;

    if (!repoOwner || !repoName) {
      return res.status(400).json({ message: "Repository owner and name are required." });
    }

    // a unique Shipnode subdomain (e.g., my-app-9a8b)
    const randomHash = crypto.randomBytes(3).toString("hex");
    const subdomain = `${repoName.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${randomHash}`;
    
    // DNS verification token for Custom Domains later
    const domainVerificationToken = `shipnode-verify-${crypto.randomBytes(16).toString("hex")}`;

    // 4. Save the Project to our Neon Database
    const [newProject] = await db.insert(projects).values({
      userId: userPayload.id,
      name: repoName,
      subdomain: subdomain,
      repoName: `${repoOwner}/${repoName}`,
      rootDirectory: rootDirectory,
      framework: framework,
      installCommand: installCommand,
      buildCommand: buildCommand,
      outputDirectory: outputDirectory,
      domainVerificationToken: domainVerificationToken,
      productionBranch: branch
    }).returning();

    const incomingEnvs = req.body.envs || [];
    if (incomingEnvs.length > 0) {
      const envsToInsert = incomingEnvs.map((env: any) => ({
        projectId: newProject.id,
        key: env.key.trim(),
        value: encryptToken(env.value), // Encrypt it for the vault!
        target: "ALL"
      }));
      
      await db.insert(projectEnvs).values(envsToInsert);
    }
    const [dbUser] = await db.select().from(users).where(eq(users.id, userPayload.id));
    
    if (!dbUser || !dbUser.githubAccessToken) {
        // ROLLBACK: Delete the ghost project if we can't authenticate with GitHub
        await db.delete(projects).where(eq(projects.id, newProject.id));
        return res.status(403).json({ message: "GitHub token missing or expired. Please re-authenticate." });
    }

    const githubToken = decryptToken(dbUser.githubAccessToken);

    // Ask GitHub for the latest commit on the selected branch
    // Ask GitHub for the latest commit on the selected branch
    let commitResponse;
    let newlyQueuedDeploymentId = null;

    try {
      commitResponse = await axios.get(
        `https://api.github.com/repos/${repoOwner}/${repoName}/commits/${branch}`,
        {
          headers: {
            Authorization: `Bearer ${githubToken}`,
            Accept: "application/vnd.github.v3+json"
          }
        }
      );

      const latestCommitSha = commitResponse.data.sha;
      const latestCommitMessage = commitResponse.data.commit.message;

      // Queue it up in the database so the Docker worker starts immediately
      const queuedDeployments = await queueNewDeployment(
        `${repoOwner}/${repoName}`, 
        branch, 
        latestCommitSha, 
        latestCommitMessage || "Initial deployment via Shipnode"
      );

      // Extract the ID to send to the frontend
      if (queuedDeployments && queuedDeployments.length > 0) {
        newlyQueuedDeploymentId = queuedDeployments[0].id;
      }

    } catch (err: any) {
      
      await db.delete(projects).where(eq(projects.id, newProject.id));
      
      return res.status(400).json({ 
        success: false,
        message: `Could not find branch '${branch}' on GitHub. (Is your repo empty, or is the branch named 'master'?)` 
      });
    }

    // Call GitHub and attach the Webhook
    try {
      // Pass the raw decrypted token to your webhook creator
      await createGithubWebhook(githubToken, repoOwner, repoName);
    } catch (webhookError) {
      // ROLLBACK: If it fails
      await db.delete(projects).where(eq(projects.id, newProject.id));
      throw webhookError; 
    }

    
    return res.status(201).json({
      success: true,
      message: "Project created and webhook attached successfully.",
      data: {
          project: newProject,
          deploymentId: newlyQueuedDeploymentId // React needs this for the redirect!
      }
    });

  } catch (error: any) {
    console.error("Create Project Error:", error);
    
    // Handle Postgres Unique Constraint errors (e.g., subdomain clash)
    if (error.code === '23505') {
       return res.status(409).json({ message: "A project with this configuration already exists." });
    }

    return res.status(500).json({ message: "Failed to create project." });
  }
};


export const handleGithubWebhook = async (req: Request | any, res: Response) => {
  try {
    const signature = req.headers["x-hub-signature-256"] as string;
    
    // 1. Security Check using the RAW Buffer (or raw string in testing)
    const rawBodyOrPayload = req.rawBody || JSON.stringify(req.body);
    if (!verifyWebhookSignature(rawBodyOrPayload, signature)) {
      return res.status(401).json({ message: "Unauthorized: Invalid signature" });
    }

    const event = req.headers["x-github-event"];
    
    if (event === "ping") {
      return res.status(200).json({ message: "Pong! Webhook connected." });
    }
    
    if (event !== "push") {
      return res.status(200).json({ message: "Event ignored." });
    }

    // 2. Extract and Queue
    const payload = req.body;
    const repoFullName = payload.repository.full_name;
    const branch = payload.ref.replace("refs/heads/", "");
    const commitHash = payload.after;
    const commitMessage = payload.head_commit?.message || "Manual deployment";

    const newDeployments = await queueNewDeployment(repoFullName, branch, commitHash, commitMessage);

    return res.status(200).json({ 
      message: "Deployments queued successfully",
      deployments: newDeployments.map(d => d.id)
    });

  } catch (error: any) {
    console.error("Webhook Error:", error.message);
    return res.status(200).json({ message: "Internal error processing webhook." }); 
  }
};




export const getRepoContents = async (req: AuthRequest, res: Response) => {
  try {
    const userPayload = req.user;
    if (!userPayload) {
      return res.status(401).json({ message: "Unauthorized: Please log in." });
    }

    // Since this is a GET request, we take data from req.query, not req.body
    const { repoOwner, repoName, path = "", branch = "" } = req.query;

    if (!repoOwner || !repoName) {
      return res.status(400).json({ message: "Repository owner and name are required." });
    }

    // Pass the work to the Service
    const contents = await fetchRepoContentsService(
      userPayload.id,
      repoOwner as string,
      repoName as string,
      path as string,
      branch as string
    );

    return res.status(200).json({
      success: true,
      data: contents
    });

  } catch (error: any) {
    console.error("Get Repo Contents Error:", error);

    // Handle specific errors thrown by the Service
    if (error.message === "GITHUB_AUTH_FAILED") {
      return res.status(403).json({ message: "GitHub token missing or expired. Please re-authenticate." });
    }

    return res.status(500).json({ message: "Failed to fetch repository contents." });
  }
};


export const getRepoBranches = async (req: AuthRequest, res: Response) => {
  try {
    const userPayload = req.user;
    if (!userPayload) {
      return res.status(401).json({ message: "Unauthorized: Please log in." });
    }

    const { repoOwner, repoName } = req.query;

    if (!repoOwner || !repoName) {
      return res.status(400).json({ message: "Repository owner and name are required." });
    }

    const branches = await fetchRepoBranchesService(
      userPayload.id,
      repoOwner as string,
      repoName as string
    );

    return res.status(200).json({
      success: true,
      data: branches
    });

  } catch (error: any) {
    console.error("Get Repo Branches Error:", error);

    // Handle specific errors thrown by the Service
    if (error.message === "GITHUB_AUTH_FAILED") {
      return res.status(403).json({ message: "GitHub token missing or expired. Please re-authenticate." });
    }

    return res.status(500).json({ message: "Failed to fetch repository branches." });
  }
};