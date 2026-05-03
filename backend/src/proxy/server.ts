import express from 'express';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { ENV } from '../lib/env.js';
import { Readable } from 'stream'; 
import { db } from '../db/index.js';
import { projects , deployments } from '../db/schema.js';
import { and, eq } from 'drizzle-orm';
import redis from '../lib/redis.js'; 
import rateLimit from 'express-rate-limit';
import { isValidDomain } from '../utils/domain-validator.js'; 
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



const limiter = rateLimit({
    windowMs: 1 * 60 * 1000,
    max: 100,
    standardHeaders: true,
    legacyHeaders: false,
});

app.use(limiter);

app.get('/health', async (req, res) => {
    try {
        await redis.ping();
        await db.select().from(projects).limit(1); // Quick DB health check
        
        res.status(200).json({ 
            status: 'ok', 
            timestamp: new Date().toISOString() 
        });
    } catch (error) {
        res.status(503).json({ 
            status: 'unhealthy', 
            error: (error as Error).message 
        });
    }
});

app.use(async (req, res) => {
    const startTime = Date.now();
   

  

    // FIX 1: Lift these up here so the logger at the bottom can see them!
    let cachedData: string | null = null;
    let cachedDomain: string | null = null;
    
    try { 
        let hostname = req.hostname;
        const ROOT_DOMAIN = process.env.ROOT_DOMAIN || 'soumyodeep.online';
        const PLATFORM_DOMAINS = [
            'soumyodeep.online',
            'www.soumyodeep.online',
            'test.soumyodeep.online',
            // 'shipnode.com',
            // 'www.shipnode.com'
        ];

        let subdomain: string | null = null;
        let isCustomDomain = false;
        let PROJECT_ID: number;
        let DEPLOYMENT_ID: number;

        console.log(`[${new Date().toISOString()}] Request: ${hostname}${req.path}`);

        // ==========================================
        // STEP 1: NORMALIZE HOSTNAME
        // ==========================================
        // Remove www prefix for easier handling
        const isWWW = hostname.startsWith('www.');
        const normalizedHostname = isWWW ? hostname.slice(4) : hostname;

        // ==========================================
        // STEP 2: DETERMINE REQUEST TYPE
        // ==========================================
        
        // Case A: Localhost (Development)
        if (hostname === 'localhost' || hostname.endsWith(':8000')) {
            return res.send(`
                <h1>🚀 Shipnode Edge Network</h1>
                <p>Status: Online</p>
                <p>Environment: Development</p>
                <p>Try: <code>project123.localhost:8000</code></p>
            `);
        }

        // Case B: Localhost with subdomain (Development)
        if (hostname.endsWith('.localhost')) {
            subdomain = hostname.replace('.localhost', '');
            console.log(`[DEV] Subdomain detected: ${subdomain}`);
        }

        // Case C: Platform root domain (Production)
        else if (PLATFORM_DOMAINS.includes(hostname)) {
            return res.send(`
                <!DOCTYPE html>
                <html>
                <head>
                    <title>Shipnode - Deploy Your Apps</title>
                    <style>
                        body { 
                            font-family: system-ui; 
                            max-width: 600px; 
                            margin: 100px auto; 
                            text-align: center; 
                        }
                    </style>
                </head>
                <body>
                    <h1>🚀 Shipnode</h1>
                    <p>Deploy your web applications with ease.</p>
                    <a href="https://dashboard.${ROOT_DOMAIN}">Go to Dashboard</a>
                </body>
                </html>
            `);
        }

        // Case D: Platform subdomain (Production)
        else if (normalizedHostname.endsWith(`.${ROOT_DOMAIN}`)) {
            subdomain = normalizedHostname.replace(`.${ROOT_DOMAIN}`, '');
            
            // Reserved subdomains (don't serve projects here)
            const RESERVED_SUBDOMAINS = [
                'www', 'api', 'dashboard', 'admin', 'app', 
                'mail', 'email', 'cdn', 'assets', 'static',
                'blog', 'docs', 'status', 'support'
            ];

            if (RESERVED_SUBDOMAINS.includes(subdomain)) {
                return res.status(403).send(`
                    <h1>403 Forbidden</h1>
                    <p>This subdomain is reserved for platform use.</p>
                `);
            }

            console.log(`[PLATFORM] Subdomain: ${subdomain}`);
        }

        // Case E: Custom Domain
        else {
            // Basic domain validation
            if (!isValidDomain(hostname)) {
                return res.status(400).send('Invalid domain format');
            }

            isCustomDomain = true;
            console.log(`[CUSTOM] Domain: ${hostname}`);
        }

        // ==========================================
        // STEP 3: LOOKUP PROJECT & DEPLOYMENT
        // ==========================================
        
        if (isCustomDomain) {
            // CUSTOM DOMAIN LOOKUP
            const cacheKey = `domain:${normalizedHostname}`;
            try {
                cachedDomain = await redis.get(cacheKey);
            } catch (redisError) {
                console.error('[Redis Error]', (redisError as Error).message);
            }

            if (cachedDomain) {
                const parsed = JSON.parse(cachedDomain);
                PROJECT_ID = parsed.projectId;
                DEPLOYMENT_ID = parsed.deploymentId;
                console.log(`[Cache HIT] Custom domain: ${normalizedHostname}`);
            } else {
                console.log(`[Cache MISS] Querying DB for: ${normalizedHostname}`);
                
                const [project] = await db.select()
                    .from(projects)
                    .where(
                        and(
                            eq(projects.customDomain, normalizedHostname),
                            eq(projects.domainVerified, true)
                        )
                    );

                if (project && project.activeDeploymentId) {
                    PROJECT_ID = project.id;
                    DEPLOYMENT_ID = project.activeDeploymentId;
                    
                    try {
                        await redis.set(
                            cacheKey,
                            JSON.stringify({ 
                                projectId: PROJECT_ID, 
                                deploymentId: DEPLOYMENT_ID 
                            }), 
                            'EX',
                            3600 // 1 hour
                        );
                    } catch (redisError) {
                        console.error('[Redis Set Error]', (redisError as Error).message);
                    }
                } else {
                    return res.status(404).send(`
                        <h1>404 - Domain Not Found</h1>
                        <p>This custom domain is not configured or verified.</p>
                        <p>Domain: <code>${normalizedHostname}</code></p>
                    `);
                }
            }
        } 
        
        else if (subdomain) {
            // PLATFORM SUBDOMAIN LOOKUP
            const cacheKey = `subdomain:${subdomain}`;            
            try {
                cachedData = await redis.get(cacheKey);
            } catch (redisError) {
                console.error('[Redis Error]', (redisError as Error).message);
            }

            if (cachedData) {
                const parsed = JSON.parse(cachedData);
                PROJECT_ID = parsed.projectId;
                DEPLOYMENT_ID = parsed.deploymentId;
                console.log(`[Cache HIT] Subdomain: ${subdomain}`);
            } else {
                console.log(`[Cache MISS] Querying DB for subdomain: ${subdomain}`);
                
                // Check both project subdomain AND preview deployments
                const [project] = await db.select()
                    .from(projects)
                    .where(eq(projects.subdomain, subdomain));

                const [preview] = await db.select()
                    .from(deployments)
                    .where(eq(deployments.previewUrl, subdomain));

                if (project && project.activeDeploymentId) {
                    PROJECT_ID = project.id; 
                    DEPLOYMENT_ID = project.activeDeploymentId;
                    console.log(`[Project Found] ID: ${PROJECT_ID}`);
                } 
                else if (preview && preview.status === 'READY') {
                    PROJECT_ID = preview.projectId;
                    DEPLOYMENT_ID = preview.id;
                    console.log(`[Preview Found] ID: ${DEPLOYMENT_ID}`);
                } 
                else {
                    return res.status(404).send(`
                        <h1>404 - Deployment Not Found</h1>
                        <p>Subdomain: <code>${subdomain}.${ROOT_DOMAIN}</code></p>
                        <p>This deployment doesn't exist or is still building.</p>
                    `);
                }

                try {
                    await redis.set(
                        cacheKey,
                        JSON.stringify({ 
                            projectId: PROJECT_ID, 
                            deploymentId: DEPLOYMENT_ID 
                        }), 
                        'EX',
                        3600
                    );
                } catch (redisError) {
                    console.error('[Redis Set Error]', (redisError as Error).message);
                }
            }
        }
        
        else {
            // Should never reach here due to earlier checks
            return res.status(400).send('Invalid request');
        }

        // ==========================================
        // STEP 4: SERVE FILE FROM R2
        // ==========================================
        const ASSET_EXTENSIONS = [
            '.js', '.css', '.png', '.jpg', '.jpeg', '.gif', 
            '.svg', '.ico', '.woff', '.woff2', '.ttf', '.eot',
            '.json', '.xml', '.txt', '.pdf', '.webp', '.avif',
            '.map', '.webmanifest'
        ];
        
        const hasKnownExtension = ASSET_EXTENSIONS.some(ext => 
            req.path.toLowerCase().endsWith(ext)
        );
        
        // SPA routing: serve index.html for non-asset requests
        let targetPath = req.path;
        if (!hasKnownExtension || req.path === '/') {
            targetPath = '/index.html';
        }

        const bucketKey = `outputs/project_${PROJECT_ID}/deploy_${DEPLOYMENT_ID}${targetPath}`;
        console.log(`[R2 Fetch] Key: ${bucketKey}`);

        const command = new GetObjectCommand({
            Bucket: process.env.R2_BUCKET_NAME,
            Key: bucketKey
        });

        // Fetch from R2 with timeout
        const response = await Promise.race([
            s3Client.send(command),
            new Promise((_, reject) => 
                setTimeout(() => reject(new Error('R2_TIMEOUT')), 10000)
            )
        ]) as any;

        // ==========================================
        // STEP 5: SET HEADERS & SEND RESPONSE
        // ==========================================
        
        // Security headers
        res.setHeader('X-Content-Type-Options', 'nosniff');
        // res.setHeader('X-Frame-Options', 'SAMEORIGIN');
        res.setHeader('X-XSS-Protection', '1; mode=block');
        
        // Content type
        if (response.ContentType) {
            res.setHeader('Content-Type', response.ContentType);
        }

        // Cache headers
        if (targetPath.startsWith('/assets/') || 
            ASSET_EXTENSIONS.some(ext => targetPath.endsWith(ext))) {
            // Cache assets aggressively
            res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
            res.setHeader('CDN-Cache-Control', 'public, max-age=31536000');
        } else if (targetPath === '/index.html') {
            // Never cache HTML
            res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
            res.setHeader('Pragma', 'no-cache');
            res.setHeader('Expires', '0');
            res.setHeader('CDN-Cache-Control', 'no-store');
        }

        // CDN cache tag for purging
        res.setHeader('Cache-Tag', `project-${PROJECT_ID},deploy-${DEPLOYMENT_ID}`);

        // Performance logging
        const responseTime = Date.now() - startTime;
        console.log(JSON.stringify({
            timestamp: new Date().toISOString(),
            hostname,
            path: req.path,
            targetPath,
            projectId: PROJECT_ID,
            deploymentId: DEPLOYMENT_ID,
            responseTime,
            isCustomDomain,
            cacheHit: !!(cachedData || cachedDomain)
        }));

        // Stream response
        (response.Body as Readable)?.pipe(res);

    } catch (error: any) {
        console.error('[Proxy Error]', {
            timestamp: new Date().toISOString(),
            error: error.message,
            name: error.name,
            hostname: req.hostname,
            path: req.path,
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });

        if (error.name === 'NoSuchKey') {
            res.status(404).send(`
                <h1>404 - File Not Found</h1>
                <p>The requested file does not exist in this deployment.</p>
                <p>Path: <code>${req.path}</code></p>
            `);
        } else if (error.message === 'R2_TIMEOUT') {
            res.status(504).send(`
                <h1>504 - Gateway Timeout</h1>
                <p>The storage service took too long to respond.</p>
            `);
        } else {
            res.status(500).send(`
                <h1>500 - Internal Server Error</h1>
                <p>Something went wrong on our end.</p>
            `);
        }
    }
});

// Cache invalidation helper
export async function invalidateCache(
    projectId: string, 
    subdomain?: string, 
    customDomain?: string
) {
    const promises = [];
    
    if (subdomain) {
        console.log(`[Cache Invalidate] Subdomain: ${subdomain}`);
        promises.push(redis.del(`subdomain:${subdomain}`));
    }
    
    if (customDomain) {
        console.log(`[Cache Invalidate] Custom domain: ${customDomain}`);
        promises.push(redis.del(`domain:${customDomain}`));
    }
    
    const results = await Promise.allSettled(promises);
    
    results.forEach((result, index) => {
        if (result.status === 'rejected') {
            console.error(`[Cache Invalidate Failed] Index ${index}:`, result.reason);
        }
    });
}

app.listen(PORT, () => {
    console.log(`Reverse Proxy Server running on port ${PORT}`);
    console.log(`Waiting for dynamic traffic...`);
});