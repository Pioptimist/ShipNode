const path = require("path");
const fs = require("fs");
const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");
const mime = require("mime-types");
const Redis = require("ioredis");

const PROJECT_ID = process.env.PROJECT_ID;
const DEPLOYMENT_ID = process.env.DEPLOYMENT_ID;
const ENV_OUTPUT_DIR = process.env.OUTPUT_DIR; 
const REDIS_URL = process.env.REDIS_URL;
const BUCKET_NAME = process.env.R2_BUCKET_NAME;

// Redis Publisher for Live Logs
const publisher = new Redis(REDIS_URL, {
    maxRetriesPerRequest: 1,
    retryStrategy: () => null // Stop retrying on connection failure
});

publisher.on('error', (err) => {
    // console.warn('Redis Connection Error:', err.message); // Commented to keep logs clean
});

function publishLog(log) {
    if(!log) return;
    try {
        publisher.publish(`logs:${DEPLOYMENT_ID}`, JSON.stringify({ log: log.toString() }));
    } catch(err) {
        // Ignore redis publish errors if it's down
    }
}


const s3Client = new S3Client({
    region: "auto",
    endpoint: process.env.R2_ENDPOINT,
    credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID,
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY
    }
});

async function init() {
    publishLog('Starting Cloudflare R2 Upload Process...');
    
    // /home/app/workspace is where main.sh cloned the code
    // user's ROOT_DIR is where the app actually is inside the repo
    const rootDir = process.env.ROOT_DIR || "/";
    const basePath = path.join(__dirname, "workspace", rootDir);

    let finalOutputDir = ENV_OUTPUT_DIR;
    let distFolderPath = "";

    // If the user explicitly provided an output directory
    if (finalOutputDir) {
        distFolderPath = path.join(basePath, finalOutputDir);
    } else {
        
        const possibleDirs = ["dist", "build", "out", ".next", "public"];
        for (const dir of possibleDirs) {
            const possiblePath = path.join(basePath, dir);
            if (fs.existsSync(possiblePath)) {
                finalOutputDir = dir;
                distFolderPath = possiblePath;
                break; 
            }
        }
    }

    if (!finalOutputDir || !fs.existsSync(distFolderPath)) {
        publishLog(`Error: Could not find build output directory (tried: dist, build, out, .next, public). Did the build fail?`);
        console.error(`Directory not found in: ${basePath}`);
        process.exit(1);
    }

    publishLog(`Uploading missing files from ${finalOutputDir} directory...`);

    // Read all files recursively (requires Node 20+)
    const distFolderContents = fs.readdirSync(distFolderPath, { recursive: true });

    publishLog(`Uploading ${distFolderContents.length} files...`);

    for (const file of distFolderContents) {
        const filePath = path.join(distFolderPath, file);
        if (fs.lstatSync(filePath).isDirectory()) continue;

        // Ensure we upload subfolders correctly (e.g. assets/style.css)
        // Convert backward slashes to forward slashes for S3 keys on Windows/Linux mix
        const bucketKey = `outputs/project_${PROJECT_ID}/deploy_${DEPLOYMENT_ID}/${file.replace(/\\/g, '/')}`;

        const command = new PutObjectCommand({
            Bucket: BUCKET_NAME,
            Key: bucketKey,
            Body: fs.createReadStream(filePath),  // Stream the file to handle large files efficiently instead of loading into memory
            ContentType: mime.lookup(filePath) || 'application/octet-stream'
        });

        try {
            await s3Client.send(command);   //just like axios put , since we dont need upload url , this will work fine
            publishLog(`Uploaded: ${file}`);
            console.log('uploaded', bucketKey);
        } catch (error) {
            publishLog(`Failed to upload ${file}: ${error.message}`);
            console.error('Upload Error:', error);
        }
    }
    
    publishLog(`Deployment Complete!`);
    console.log('Done...');
    process.exit(0);
}

init();