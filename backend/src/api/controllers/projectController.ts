import { desc } from "drizzle-orm"; // Make sure to import 'desc'
import { Response } from "express";
import { AuthRequest } from "../middleware/authMiddleware.js";
import { db } from "../../db/index.js";
import { eq } from "drizzle-orm";
import { users,deployments, projects, requestLogs, projectEnvs } from "../../db/schema.js";
import { decryptToken } from "../../utils/crypto.js";
import { deleteGithubWebhook, deleteR2Directory } from "../services/deploymentService.js";


export const getUserProjects = async (req: AuthRequest, res: Response) => {
  try {
    const userPayload = req.user;
    if (!userPayload) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    // 1. Fetch all projects for this user
    const userProjects = await db
      .select()
      .from(projects)
      .where(eq(projects.userId, userPayload.id));

    // 2. Attach the latest deployment status to each project for the UI cards
    const projectsWithStatus = await Promise.all(
      userProjects.map(async (project) => {
        const [latestDeploy] = await db
          .select({
            status: deployments.status,
            createdAt: deployments.createdAt,
            commitMessage: deployments.commitMessage,
            branch: deployments.branch
          })
          .from(deployments)
          .where(eq(deployments.projectId, project.id))
          .orderBy(desc(deployments.createdAt)) // Get the newest one
          .limit(1);

        return {
          ...project,
          latestDeployment: latestDeploy || null,
        };
      })
    );

    return res.status(200).json({ success: true, data: projectsWithStatus });
  } catch (error) {
    console.error("Fetch Projects Error:", error);
    return res.status(500).json({ message: "Failed to fetch projects." });
  }
};

 // Or wherever your decrypt function is


export const deleteProject = async (req: AuthRequest, res: Response) => {
  try {
    const userPayload = req.user;
    if (!userPayload) return res.status(401).json({ message: "Unauthorized" });

    const projectId = Number(req.params.id);

    // 1. Get the project AND the user's github token
    const [targetProject] = await db.select().from(projects).where(eq(projects.id, projectId));
    if (!targetProject) return res.status(404).json({ message: "Project not found." });
    if (targetProject.userId !== userPayload.id) return res.status(403).json({ message: "Forbidden" });

    const [dbUser] = await db.select().from(users).where(eq(users.id, userPayload.id));

   
    if (dbUser?.githubAccessToken) {
      const githubToken = decryptToken(dbUser.githubAccessToken);
      const [repoOwner, repoName] = targetProject.repoName.split("/");
      
      try {
        await deleteGithubWebhook(githubToken, repoOwner, repoName);
      } catch (webhookError: any) {
        return res.status(500).json({ 
          message: `Webhook deletion failed: ${webhookError.message}. Project deletion aborted.` 
        });
      }
    }
    try {
      // Get all deployments for this project to find their storage paths
      const projectDeployments = await db
        .select({ storagePath: deployments.storagePath, buildLogsUrl: deployments.buildLogsUrl })
        .from(deployments)
        .where(eq(deployments.projectId, projectId));

      for (const deploy of projectDeployments) {
        // Delete the built static files
        if (deploy.storagePath) {
          await deleteR2Directory(deploy.storagePath);
        }
        if (deploy.buildLogsUrl) {
          await deleteR2Directory(deploy.buildLogsUrl); 
        }
      }
    } catch (r2Error: any) {
      return res.status(500).json({ 
        message: "Failed to delete project files from Cloudflare R2. Project deletion aborted to prevent ghost files." 
      });
    }

    // del the other table content before project cuz of foreign key
    await db.delete(deployments).where(eq(deployments.projectId, projectId));
    await db.delete(requestLogs).where(eq(requestLogs.projectId, projectId));
    await db.delete(projectEnvs).where(eq(projectEnvs.projectId, projectId));
    await db.delete(projects).where(eq(projects.id, projectId));

    return res.status(200).json({ success: true, message: "Project deleted." });

  } catch (error: any) {
    console.error("Delete Project Error:", error);
    return res.status(500).json({ message: "Failed to delete project." });
  }
};