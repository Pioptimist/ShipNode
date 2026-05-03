import { desc } from "drizzle-orm"; // Make sure to import 'desc'
import { Response } from "express";
import { AuthRequest } from "../middleware/authMiddleware.js";
import { db } from "../../db/index.js";
import { eq } from "drizzle-orm";
import { users,deployments, projects, requestLogs, projectEnvs } from "../../db/schema.js";
import { decryptToken } from "../../utils/crypto.js";
import { deleteGithubWebhook, deleteR2Directory } from "../services/deploymentService.js";
import redis from "../../lib/redis.js";

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


export const getProjectById = async (req: AuthRequest, res: Response) => {
  try {
    const userPayload = req.user;
    if (!userPayload) {
      return res.status(401).json({ message: "Unauthorized: Please log in." });
    }

    const { id } = req.params; // Note: using 'id' instead of 'projectId' to match your route

    if (!id || isNaN(Number(id))) {
      return res.status(400).json({ message: "Valid Project ID is required." });
    }

    // 1. Fetch the project
    const [project] = await db.select()
      .from(projects)
      .where(eq(projects.id, Number(id)));

    // 2. Security Checks
    if (!project) {
      return res.status(404).json({ message: "Project not found." });
    }

    if (project.userId !== userPayload.id) {
      return res.status(403).json({ message: "Forbidden: You do not have access to this project." });
    }

    // 3. Return the data to React
    return res.status(200).json({
      success: true,
      data: project
    });

  } catch (error: any) {
    console.error("Fetch Project By ID Error:", error);
    return res.status(500).json({ message: "Failed to fetch project details." });
  }
};
export const rollbackProject = async (req: AuthRequest, res: Response) => {
  try {
    const userPayload = req.user;
    if (!userPayload) {
      return res.status(401).json({ message: "Unauthorized: Please log in." });
    }

    const { projectId } = req.params;
    const { targetDeploymentId } = req.body;

    if (!targetDeploymentId) {
      return res.status(400).json({ message: "Target deployment ID is required." });
    }

    // 1. Verify the project exists and belongs to the user
    const [project] = await db.select()
      .from(projects)
      .where(eq(projects.id, Number(projectId)));

    if (!project || project.userId !== userPayload.id) {
      return res.status(404).json({ message: "Project not found or unauthorized." });
    }

    // 2. Verify the target deployment exists, belongs to this project, and is actually READY
    const [targetDeployment] = await db.select()
      .from(deployments)
      .where(eq(deployments.id, Number(targetDeploymentId)));

    if (!targetDeployment || targetDeployment.projectId !== project.id) {
      return res.status(404).json({ message: "Deployment not found for this project." });
    }

    if (targetDeployment.status !== "READY") {
      return res.status(400).json({ message: "Cannot rollback to a deployment that failed or is still building." });
    }

    // 3. THE MAGIC FLIP: Update the active pointer
    await db.update(projects)
      .set({ activeDeploymentId: Number(targetDeploymentId) })
      .where(eq(projects.id, Number(projectId)));

    // 4. THE CACHE BUST: Force the proxy to read the new activeDeploymentId
    if (project.subdomain) {
      await redis.del(`subdomain:${project.subdomain}`);
    }
    if (project.customDomain) {
      await redis.del(`domain:${project.customDomain}`);
    }

    return res.status(200).json({
      success: true,
      message: "Rollback successful. The selected deployment is now live.",
      data: {
        newActiveDeploymentId: targetDeploymentId
      }
    });

  } catch (error: any) {
    console.error("Rollback Error:", error);
    return res.status(500).json({ message: "Internal server error during rollback." });
  }
};