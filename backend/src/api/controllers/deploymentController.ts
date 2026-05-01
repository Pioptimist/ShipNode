import { Request, Response } from "express";
import { db } from "../../db/index.js";
import { deployments, projects } from "../../db/schema.js";
import { eq } from "drizzle-orm";
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import { ENV } from "../../lib/env.js";
import { desc } from "drizzle-orm";
import { AuthRequest } from "../middleware/authMiddleware.js";

const s3Client = new S3Client({
    region: "auto",
    endpoint: ENV.R2_ENDPOINT,
    credentials: {
        accessKeyId: ENV.R2_ACCESS_KEY_ID,
        secretAccessKey: ENV.R2_SECRET_ACCESS_KEY
    }
});

export const getDeploymentStatus = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;

        // Fetch deployment AND join the project table to get the subdomain
        const [deploymentRecord] = await db
            .select({
                id: deployments.id,
                status: deployments.status,
                commitHash: deployments.commitHash,
                commitMessage: deployments.commitMessage,
                subdomain: projects.subdomain,
                repoName: projects.repoName,
                buildLogsUrl: deployments.buildLogsUrl
            })
            .from(deployments)
            .innerJoin(projects, eq(deployments.projectId, projects.id))
            .where(eq(deployments.id, Number(id)));

        if (!deploymentRecord) {
            return res.status(404).json({ success: false, message: "Deployment not found" });
        }

        return res.status(200).json({ success: true, data: deploymentRecord });
    } catch (error) {
        console.error("Failed to fetch deployment:", error);
        return res.status(500).json({ success: false, message: "Server error" });
    }
};

export const getDeploymentLogs = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const [deploymentRecord] = await db
            .select({ buildLogsUrl: deployments.buildLogsUrl })
            .from(deployments)
            .where(eq(deployments.id, Number(id)));

        if (!deploymentRecord || !deploymentRecord.buildLogsUrl) {
            return res.status(404).json({ success: false, message: "Logs not found" });
        }

        const command = new GetObjectCommand({
            Bucket: ENV.R2_BUCKET_NAME,
            Key: deploymentRecord.buildLogsUrl,
        });

        const s3Response = await s3Client.send(command);
        const logData = await s3Response.Body?.transformToString();

        return res.status(200).send(logData);
    } catch (error) {
        console.error("Failed to fetch deployment logs:", error);
        return res.status(500).json({ success: false, message: "Server error" });
    }
};




export const getAllUserDeployments = async (req: AuthRequest, res: Response) => {
  try {
    const userPayload = req.user;
    if (!userPayload) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    // Fetch deployments and JOIN the projects table to ensure the user owns them
    const allDeployments = await db
      .select({
        id: deployments.id,
        status: deployments.status,
        branch: deployments.branch,
        commitHash: deployments.commitHash,
        commitMessage: deployments.commitMessage,
        createdAt: deployments.createdAt,
        buildTimeMs: deployments.buildTimeMs,
        buildLogsUrl: deployments.buildLogsUrl, // For the logs
        projectName: projects.name,             // To display what project this is for
        subdomain: projects.subdomain
      })
      .from(deployments)
      .innerJoin(projects, eq(deployments.projectId, projects.id))
      .where(eq(projects.userId, userPayload.id))
      .orderBy(desc(deployments.createdAt)); // Newest at the top

    return res.status(200).json({ success: true, data: allDeployments });
  } catch (error) {
    console.error("Fetch All Deployments Error:", error);
    return res.status(500).json({ message: "Failed to fetch deployments." });
  }
};



export const getProjectDeployments = async (req: AuthRequest, res: Response) => {
  try {
    const userPayload = req.user;
    if (!userPayload) {
      return res.status(401).json({ message: "Unauthorized: Please log in." });
    }

    const { projectId } = req.params;

    if (!projectId || isNaN(Number(projectId))) {
      return res.status(400).json({ message: "Valid Project ID is required." });
    }

    // 1. SECURITY CHECK: Ensure the project actually belongs to this user!
    const [project] = await db.select()
      .from(projects)
      .where(eq(projects.id, Number(projectId)));

    if (!project) {
      return res.status(404).json({ message: "Project not found." });
    }

    if (project.userId !== userPayload.id) {
      return res.status(403).json({ message: "Forbidden: You do not have access to this project." });
    }

    // 2. Fetch the deployment history, newest first!
    const projectDeployments = await db.select()
      .from(deployments)
      .where(eq(deployments.projectId, Number(projectId)))
      .orderBy(desc(deployments.createdAt));

    return res.status(200).json({ 
      success: true, 
      data: projectDeployments 
    });

  } catch (error) {
    console.error("Fetch Project Deployments Error:", error);
    return res.status(500).json({ message: "Failed to fetch project deployments." });
  }
};