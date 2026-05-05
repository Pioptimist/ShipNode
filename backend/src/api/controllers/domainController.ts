import { Request, Response } from "express";
import { eq, and, ne } from "drizzle-orm";
import dns from "dns/promises"; // Node's native DNS module!
import { db } from "../../db/index.js";
import { projects } from "../../db/schema.js";
import { AuthRequest } from "../middleware/authMiddleware.js";
import redis from "../../lib/redis.js";
// --- Helper to clean up user input ---
// Turns "https://my-app.soumyodeep.online/" into "my-app.soumyodeep.online"
const sanitizeDomain = (domain: string) => {
    return domain.replace(/^https?:\/\//, '').replace(/\/$/, '').trim().toLowerCase();
};


export const addCustomDomain = async (req: AuthRequest, res: Response) => {
    try {
        const { projectId } = req.params;
        const { domain } = req.body;
        const userPayload = req.user;
        
        if(!userPayload){
            return res.status(401).json({ message: "Unauthorized" });
        }
        if (!domain) {
            return res.status(400).json({ message: "Domain is required." });
        }

        const cleanDomain = sanitizeDomain(domain);

        // Security 1: Do you own this project?
        const [project] = await db.select().from(projects).where(eq(projects.id, Number(projectId)));
        if (!project || project.userId !== userPayload.id) {
            return res.status(403).json({ message: "Forbidden" });
        }

        // Security 2: Is someone ELSE already using this domain and verified it?
        const [existingClaim] = await db.select().from(projects).where(
            and(
                eq(projects.customDomain, cleanDomain),
                eq(projects.domainVerified, true),
                ne(projects.id, Number(projectId)) // Exclude the current project
            )
        );

        if (existingClaim) {
            return res.status(409).json({ message: "This domain is already verified by another user." });
        }

        // Update the project: Set the domain and strictly lock it as UNVERIFIED
        await db.update(projects)
            .set({ 
                customDomain: cleanDomain,
                domainVerified: false 
            })
            .where(eq(projects.id, Number(projectId)));

        return res.status(200).json({ 
            success: true, 
            message: "Domain added. Please verify ownership.",
            data: {
                customDomain: cleanDomain,
                verificationToken: project.domainVerificationToken // Send token to frontend
            }
        });

    } catch (error) {
        console.error("Add Domain Error:", error);
        return res.status(500).json({ message: "Failed to add domain." });
    }
};


export const verifyCustomDomain = async (req: AuthRequest, res: Response) => {
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

        if (!project.customDomain || !project.domainVerificationToken) {
            return res.status(400).json({ message: "No custom domain configured for verification." });
        }

       
        let txtRecords: string[][] = [];
        try {
            const prefixedDomain = `_shipnode.${project.customDomain}`;
            console.log(`[DNS] Checking TXT records for ${prefixedDomain}...`);
            try {
                txtRecords = await dns.resolveTxt(prefixedDomain);
            } catch (err: any) {
                // If the prefixed check fails, fall back to checking the root domain
                // just in case they added it directly to an A-record domain.
                if (err.code === 'ENOTFOUND' || err.code === 'ENODATA') {
                    console.log(`[DNS] Falling back: Checking TXT records for ${project.customDomain}...`);
                    txtRecords = await dns.resolveTxt(project.customDomain);
                } else {
                    throw err;
                }
            }
        } catch (dnsError: any) {
            if (dnsError.code === 'ENOTFOUND' || dnsError.code === 'ENODATA') {
                return res.status(400).json({ message: "No TXT records found. Have you added them to your registrar? (It may take a few minutes to propagate)" });
            }
            throw dnsError; 
        }

        // resolveTxt returns an array of arrays: [ ['v=spf1...'], ['shipnode-verify-123...'] ]
        // We flatten it into a simple array of strings
        const flattenedRecords = txtRecords.flat();
        
        // Did we find the exact token?
        const isVerified = flattenedRecords.includes(project.domainVerificationToken);

        if (!isVerified) {
            return res.status(400).json({ 
                message: "Verification failed. Token not found in TXT records. Note: DNS changes can take up to 5-10 minutes to propagate globally." 
            });
        }

        
        await db.update(projects)
            .set({ domainVerified: true })
            .where(eq(projects.id, Number(projectId)));

        await redis.set(
            `domain:${project.customDomain}`,
            JSON.stringify({
                projectId: project.id,
                deploymentId: project.activeDeploymentId // Drizzle grabbed this in the SELECT query!
            }),
            'EX',
            3600 // Keep it consistent with the proxy's 1-hour expiration
        );
        console.log(`[Redis] Mapped custom domain ${project.customDomain} -> Project ID: ${project.id}`);

        return res.status(200).json({ 
            success: true, 
            message: "Domain verified successfully! Your site is now live." 
        });

    } catch (error) {
        console.error("Verify Domain Error:", error);
        return res.status(500).json({ message: "Failed to verify domain." });
    }
};


export const removeCustomDomain = async (req: AuthRequest, res: Response) => {
    try {
        const { projectId } = req.params;
        const userPayload = req.user;

        // 1. Basic Authorization
        if (!userPayload) {
            return res.status(401).json({ success: false, message: "Unauthorized" });
        }

        // 2. Fetch Project & Verify Ownership
        const [project] = await db.select()
            .from(projects)
            .where(eq(projects.id, Number(projectId)));

        if (!project || project.userId !== userPayload.id) {
            return res.status(403).json({ success: false, message: "Forbidden" });
        }

        if (!project.customDomain) {
            return res.status(400).json({ success: false, message: "No custom domain is attached to this project." });
        }

        const domainToPurge = project.customDomain;

        // 3. Database Teardown: Wipe the domain columns
        await db.update(projects)
            .set({ 
                customDomain: null,
                domainVerified: false,
                domainVerificationToken: null
            })
            .where(eq(projects.id, Number(projectId)));

        // 4. Edge Cache Purge: INSTANTLY take the domain offline
        try {
            await redis.del(`domain:${domainToPurge}`);
            console.log(`[Redis] Purged Custom Domain from Edge Cache: ${domainToPurge}`);
        } catch (redisError) {
            console.error(`[Redis] Failed to purge domain ${domainToPurge}:`, redisError);
            // We don't fail the request here, but it will expire in 1 hour anyway
        }

        return res.status(200).json({ 
            success: true, 
            message: "Domain disconnected successfully. Traffic will stop routing immediately." 
        });

    } catch (error) {
        console.error("Remove Domain Error:", error);
        return res.status(500).json({ success: false, message: "Failed to remove domain." });
    }
};

export const checkDomainForCaddy = async (req: Request, res: Response) => {
    // Caddy passes the domain exactly like: ?domain=demo.shipnode.soumyodeep.online
    const domainToCheck = req.query.domain as string;

    if (!domainToCheck) return res.status(400).send("No domain provided");

    // 1. Auto-Approve ALL your platform preview subdomains
    if (domainToCheck.endsWith(".shipnode.soumyodeep.online")) {
        return res.status(200).send("OK"); // Tell Caddy to issue the SSL!
    }

    // 2. Otherwise, check the DB for custom domains
    const [project] = await db.select()
        .from(projects)
        .where(eq(projects.customDomain, domainToCheck));

    if (project && project.domainVerified) {
        return res.status(200).send("OK"); // Valid Custom Domain!
    }

    // 3. Reject the SSL certificate issuance
    return res.status(404).send("Not Found"); 
};