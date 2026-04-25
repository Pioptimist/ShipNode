import express from 'express';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { ENV } from '../lib/env.js';
import { Readable } from 'stream'; 
import { db } from '../db/index.js';
import { projects } from '../db/schema.js';
import { eq } from 'drizzle-orm';
import redis from '../lib/redis.js'; // 🚨 IMPORT REDIS

const app = express();
const PORT = 8000;



const s3Client = new S3Client({
    region: "auto",
    endpoint: ENV.R2_ENDPOINT,
    credentials: {
        accessKeyId: ENV.R2_ACCESS_KEY_ID,
        secretAccessKey: ENV.R2_SECRET_ACCESS_KEY
    }
});

app.use(async (req, res) => {
    try { 
        const hostname = req.hostname;
        const subdomain = hostname.split('.')[0];

        if (subdomain === 'localhost') {
            return res.status(200).send('Shipnode Edge Network is Online.');
        }

        let PROJECT_ID;
        let DEPLOYMENT_ID;

        
        //Check Redis memory first 
        const cachedData = await redis.get(`subdomain:${subdomain}`);

        if (cachedData) {
            // Redis Hit! Parse it and skip the Postgres database entirely.
            const parsed = JSON.parse(cachedData);
            PROJECT_ID = parsed.projectId;
            DEPLOYMENT_ID = parsed.deploymentId;
        } else {
            // Redis Miss! Query Postgres (Takes 500 milliseconds)
            const [project] = await db.select()
                .from(projects)
                .where(eq(projects.subdomain, subdomain));

            if (!project || !project.activeDeploymentId) {
                return res.status(404).send('404: Deployment Not Found or Still Building...');
            }

            PROJECT_ID = project.id; 
            DEPLOYMENT_ID = project.activeDeploymentId;

            // Save the result to Redis for 60 seconds!
            // This means the JS, CSS, and Image files will load instantly.
            await redis.set(
                `subdomain:${subdomain}`, 
                JSON.stringify({ projectId: PROJECT_ID, deploymentId: DEPLOYMENT_ID }), 
                
            );
        }

        // --- The rest of your R2 and SPA routing code stays exactly the same ---
        const hasExtension = req.path.split('/').pop()?.includes('.');
        let targetPath = req.path;
        if (!hasExtension || req.path === '/') {
            targetPath = '/index.html';
        }

        const bucketKey = `outputs/project_${PROJECT_ID}/deploy_${DEPLOYMENT_ID}${targetPath}`;

        const command = new GetObjectCommand({
            Bucket: ENV.R2_BUCKET_NAME,
            Key: bucketKey
        });

        const response = await s3Client.send(command);

        if (response.ContentType) {
            res.setHeader('Content-Type', response.ContentType);
        }

        if (targetPath.startsWith('/assets/')) {
            res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
        } else if (targetPath === '/index.html') {
            res.setHeader('Cache-Control', 'no-cache');
        }

        (response.Body as Readable)?.pipe(res);

    } catch (error: any) {
        if (error.name === 'NoSuchKey') {
            res.status(404).send(`404: File Not Found`);
        } else {
            console.error("Proxy Error:", error);
            res.status(500).send('Internal Edge Server Error');
        }
    }
});

app.listen(PORT, () => {
    console.log(`Reverse Proxy Server running on port ${PORT}`);
    console.log(`Waiting for dynamic traffic...`);
});