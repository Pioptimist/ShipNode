import { Request, Response } from "express";
import { eq, and } from "drizzle-orm";
import { db } from "../../db/index.js";
import { projects, projectEnvs } from "../../db/schema.js";
import { AuthRequest } from "../middleware/authMiddleware.js";
import { encryptToken, decryptToken } from "../../utils/crypto.js"; 

export const getProjectEnvs = async (req: AuthRequest, res: Response) => {
    try {
        const { projectId } = req.params;
        const userPayload = req.user;
        if (!userPayload) {
            return res.status(401).json({ message: "Unauthorized" });
        }

        const [project] = await db.select().from(projects).where(eq(projects.id, Number(projectId)));
        if (!project || project.userId !== userPayload.id) {
            return res.status(403).json({ message: "Forbidden" });
        }

        const envs = await db.select().from(projectEnvs).where(eq(projectEnvs.projectId, Number(projectId)));

        // Decrypt values before sending to frontend
        const decryptedEnvs = envs.map(env => ({
            ...env,
            value: decryptToken(env.value)
        }));

        return res.status(200).json({ success: true, data: decryptedEnvs });
    } catch (error) {
        console.error("Get Envs Error:", error);
        return res.status(500).json({ message: "Failed to fetch environment variables." });
    }
};

export const addProjectEnv = async (req: AuthRequest, res: Response) => {
    try {
        const { projectId } = req.params;
        const { key, value, target = "ALL" } = req.body;
        const userPayload = req.user;
        if(!userPayload){
            return res.status(401).json({ message: "Unauthorized" });
        }

        if (!key || !value) {
            return res.status(400).json({ message: "Key and Value are required." });
        }

        // Security Check
        const [project] = await db.select().from(projects).where(eq(projects.id, Number(projectId)));
        if (!project || project.userId !== userPayload.id) {
            return res.status(403).json({ message: "Forbidden" });
        }

    
        const encryptedValue = encryptToken(value);

        const [newEnv] = await db.insert(projectEnvs).values({
            projectId: Number(projectId),
            key: key.trim(),
            value: encryptedValue,
            target
        }).returning();

        return res.status(201).json({ 
            success: true, 
            data: { ...newEnv, value: value } // Return plain-text so React updates instantly
        });
    } catch (error) {
        console.error("Add Env Error:", error);
        return res.status(500).json({ message: "Failed to save environment variable." });
    }
};

export const deleteProjectEnv = async (req: AuthRequest, res: Response) => {
    try {
        const { projectId, envId } = req.params;
        const userPayload = req.user;

        if (!userPayload) {
            return res.status(401).json({ message: "Unauthorized" });
        }

        const [project] = await db.select().from(projects).where(eq(projects.id, Number(projectId)));
        if (!project || project.userId !== userPayload.id) {
            return res.status(403).json({ message: "Forbidden" });
        }

        await db.delete(projectEnvs).where(
            and(
                eq(projectEnvs.id, Number(envId)),
                eq(projectEnvs.projectId, Number(projectId))
            )
        );

        return res.status(200).json({ success: true, message: "Environment variable deleted." });
    } catch (error) {
        console.error("Delete Env Error:", error);
        return res.status(500).json({ message: "Failed to delete environment variable." });
    }
};