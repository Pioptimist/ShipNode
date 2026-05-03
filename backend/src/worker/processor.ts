import { Job } from 'bullmq';
import Docker from 'dockerode';
import { ENV } from '../lib/env.js';
import { DeployJobData } from '../lib/queue.js';
import { db } from '../db/index.js';
import { deployments , projects} from '../db/schema.js';
import { eq } from "drizzle-orm";
import redis from '../lib/redis.js'; 
import { DeploymentLogger } from './logger.js';
import { decryptToken } from '../utils/crypto.js';
import { projectEnvs } from '../db/schema.js';
// Connect to the local Windows Docker Engine (or Linux socket)
const docker = new Docker({
    socketPath: process.platform === 'win32'
        ? '//./pipe/docker_engine'
        : '/var/run/docker.sock'
});

const IGNORE_MASKING = new Set(["production", "development", "test", "staging", "true", "false", "0", "1", "yes", "no"]);

export const processDeploymentJob = async (job: Job<DeployJobData>) => {
    const { projectId, deploymentId, repoUrl, commitHash, rootDir, installCmd, buildCmd , isProduction } = job.data;
    console.log(`[Worker] Started Deployment Job: ${deploymentId} for Project: ${projectId}`);
    
    let startTime = Date.now();
    let container: Docker.Container | null = null;
    
    const dockerEnvArray: string[] = [];
    const secretsToMask: string[] = [];

    try {
        const envRecords = await db.select().from(projectEnvs).where(eq(projectEnvs.projectId, Number(projectId)));

        // Filter variables based on whether this is a Production push or a Preview branch
        const targetEnv = isProduction ? 'PRODUCTION' : 'PREVIEW';
        const activeEnvs = envRecords.filter(e => e.target === 'ALL' || e.target === targetEnv);

        for (const env of activeEnvs) {
            try {
                const decryptedValue = decryptToken(env.value);

                // Format for Docker: "KEY=VALUE"
                dockerEnvArray.push(`${env.key}=${decryptedValue}`);

                // Add to masking hitlist if it's long enough and not a generic word
                if (decryptedValue.length >= 4 && !IGNORE_MASKING.has(decryptedValue.toLowerCase())) {
                    secretsToMask.push(decryptedValue);
                }
            } catch (err) {
                console.error(`[Worker] Failed to decrypt env var: ${env.key}`, err);
                // We deliberately skip this variable rather than crashing the whole build,
                // but you could throw here if you want strict "fail secure" behavior.
            }
        }
    } catch (dbErr) {
        console.error(`[Worker] Failed to fetch env vars for project ${projectId}`, dbErr);
    }

    // 🚨 2. INITIALIZE LOGGER WITH THE SECRET HITLIST
    const logger = new DeploymentLogger(String(projectId), String(deploymentId), secretsToMask);
    try {
        // Update the database to show it's actively building!
        await db.update(deployments)
            .set({ status: 'BUILDING' })
            .where(eq(deployments.id, Number(deploymentId))); // <-- FIX 1: Cast to Number

        // Programmatically spawn the docker sandbox container!
        console.log(`[Worker] Spawning shipnode-builder sandbox...`);
        container = await docker.createContainer({
            Image: 'shipnode-builder',
            Env: [
                ...dockerEnvArray,
                `REPO_URL=${repoUrl}`,
                `COMMIT_HASH=${commitHash}`,
                `ROOT_DIR=${rootDir}`,
                `INSTALL_CMD=${installCmd}`,
                `BUILD_CMD=${buildCmd}`,
                `PROJECT_ID=${projectId}`,
                `DEPLOYMENT_ID=${deploymentId}`,
                `REDIS_URL=${process.env.REDIS_URL || 'redis://host.docker.internal:6379'}`,
                `R2_ENDPOINT=${ENV.R2_ENDPOINT}`,
                `R2_ACCESS_KEY_ID=${ENV.R2_ACCESS_KEY_ID}`,
                `R2_SECRET_ACCESS_KEY=${ENV.R2_SECRET_ACCESS_KEY}`,
                `R2_BUCKET_NAME=${ENV.R2_BUCKET_NAME}`,
                `FORCE_COLOR=1`, 
                `NPM_CONFIG_COLOR=always`
            ],
            HostConfig: {
              
                Memory: 1024 * 1024 * 1024, // 1 GB RAM MAX
                MemorySwap: 1024 * 1024 * 1024, // 0 Swap (Total memory + swap = Memory)
                NanoCpus: Math.floor(1.5 * 1000000000), // 1.5 CPU Cores MAX
                PidsLimit: 60, // Prevent fork bombs 
                CapDrop: ['ALL'],
                Privileged: false,
            }
        });

        
        const stream = await container.attach({
            stream: true,
            stdout: true,
            stderr: true
        });

        stream.on('data', Buffer.from); // for type safety, though it shouldn't matter
        
        // Use dockerode's internal modem method to correctly demultiplex headers
        container.modem.demuxStream(stream, {
            write: (chunk: Buffer) => logger.appendLog(chunk)
        }, {
            write: (chunk: Buffer) => logger.appendLog(chunk)
        });

        //Start the container
        await container.start();
        
        console.log(`[Worker] Waiting for builder container to finish...`);
        const MAX_BUILD_TIME = 5 * 60 * 1000;
        
        const result = await Promise.race([
            container.wait(),
            new Promise<never>((_, reject) => 
                setTimeout(() => reject(new Error('BUILD_TIMEOUT')), MAX_BUILD_TIME)
            )
        ]);
        
        // Wait an extra second for stream to flush
        await new Promise(r => setTimeout(r, 1000));
        
        const logsUrl = await logger.uploadToStorage();
        const buildTimeMs = Date.now() - startTime;

        console.log(`\n========== BUILD FINISHED: ${deploymentId} | Took ${buildTimeMs}ms ==========`);
        console.log(`Logs safely stored at: ${logsUrl}`);
        console.log(`========================================================================\n`);

        if (result.StatusCode === 0) {
            console.log(`[Worker] SUCCESS! Sandbox exited gracefully.`);
            
            const projectStoragePath = `outputs/project_${projectId}/deploy_${deploymentId}`;
            await db.update(deployments)
                .set({ 
                    status: 'READY',
                    buildLogsUrl: logsUrl,
                    buildTimeMs: buildTimeMs,
                    storagePath: projectStoragePath
                })
                .where(eq(deployments.id, Number(deploymentId)));
                
        
            if (isProduction) {
                await db.update(projects)
                    .set({ activeDeploymentId: Number(deploymentId) })
                    .where(eq(projects.id, Number(projectId)));
                
                const [activeProject] = await db.select()
                    .from(projects)
                    .where(eq(projects.id, Number(projectId)));

                if (activeProject?.subdomain) {
                    // del the key since code was changed.
                    await redis.del(`subdomain:${activeProject.subdomain}`);
                    console.log(`[Worker] Purged Edge Cache for: ${activeProject.subdomain}`);
                }
                if (activeProject?.customDomain) {
                    await redis.del(`domain:${activeProject.customDomain}`);
                    console.log(`[Worker] Purged Edge Cache for Custom Domain: ${activeProject.customDomain}`);
                }
                console.log(`[Worker] Project ${projectId} is now actively serving Production Deployment ${deploymentId}!`);
            } else {
                console.log(`[Worker] Preview branch built safely. Production site is completely untouched.`);
            }
            await redis.publish(`logs:${deploymentId}`, JSON.stringify({ statusUpdate: 'success' }));
                
        } else {
            throw new Error(`Sandbox exited with fatal Error Code: ${result.StatusCode}`);
        }

    } catch (error: any) {
        console.error(`[Worker] FAILED Deploy ${deploymentId}:`, error);
        
        let logsUrl = null;
        try { logsUrl = await logger.uploadToStorage(); } catch (e) {}

        const buildTimeMs = Date.now() - startTime;

        // FAILED user sees inside their Vercel Dashboard
        await db.update(deployments)
            .set({ 
                status: 'FAILED',
                buildLogsUrl: logsUrl,
                buildTimeMs: buildTimeMs
            })
            .where(eq(deployments.id, Number(deploymentId))); 
        await redis.publish(`logs:${deploymentId}`, JSON.stringify({ statusUpdate: 'failed' }));
        
        throw error; // for bullmq to retry or log.
    } finally {
        // ALWAYS destroy the container, even if the build crashed or ESLint failed
        if (container) {
            try {
                await container.remove({ force: true });
                console.log(`[Worker] Cleaned up container safely.`);
            } catch (cleanupError) {
                console.error(`[Worker] Failed to remove container:`, cleanupError);
            }
        }
    }
};