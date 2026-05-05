const path = require("path");
const fs = require("fs");
const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");
const mime = require("mime-types");

// ENV
const PROJECT_ID = process.env.PROJECT_ID;
const DEPLOYMENT_ID = process.env.DEPLOYMENT_ID;
const ENV_OUTPUT_DIR = process.env.OUTPUT_DIR;
const BUCKET_NAME = process.env.R2_BUCKET_NAME;

// S3 Client
const s3Client = new S3Client({
    region: "auto",
    endpoint: process.env.R2_ENDPOINT,
    credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID,
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY
    }
});

// Recursively collect files
function getAllFiles(dir, base = '') {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    let files = [];

    for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        const relativePath = path.join(base, entry.name);

        if (entry.isDirectory()) {
            files = files.concat(getAllFiles(fullPath, relativePath));
        } else {
            files.push(relativePath);
        }
    }

    return files;
}

async function init() {
    console.log('Starting Cloudflare R2 Upload Process...');

    const rootDir = process.env.ROOT_DIR || "/";
    const basePath = path.join(__dirname, "workspace", rootDir);

    let finalOutputDir = ENV_OUTPUT_DIR;
    let distFolderPath = finalOutputDir ? path.join(basePath, finalOutputDir) : "";

    // Handle Vanilla HTML/JS that might point to outputDirectory as "."
    if (finalOutputDir === '.' || finalOutputDir === './') {
        distFolderPath = basePath;
    }

    // 🔹 Fallback detection
    if (!finalOutputDir || !fs.existsSync(distFolderPath)) {
        // fs.existsSync is used here to check if the provided output directory exists
        if (finalOutputDir && finalOutputDir.trim() !== "") {
            // the above check is when user gave smth as output dir , even if he gave " ",since it doesnt exist we show them this
            console.log(`Provided output dir '${finalOutputDir}' not found. Falling back...`);
        }

        const possibleDirs = ["dist", "build", "out", "public"]; 

        for (const dir of possibleDirs) {
            const possiblePath = path.join(basePath, dir);
            if (fs.existsSync(possiblePath)) {
                finalOutputDir = dir;
                distFolderPath = possiblePath;
                console.log(`Auto-detected output directory: ${finalOutputDir}`);
                break;
            }
        }
    }

    
    if (!finalOutputDir || !fs.existsSync(distFolderPath)) {
        console.error(`Build output not found.`);
        console.error(`Checked in: ${basePath}`);
        process.exit(1);
    }

    // 🔹 Angular nested dist fix , angular by default makes a dist/abc/index.html , so we check if the inner stuff in dist is 1 or no.
    if (finalOutputDir === "dist") {
        const subDirs = fs.readdirSync(distFolderPath);
        if (subDirs.length === 1) {
            const nested = path.join(distFolderPath, subDirs[0]);
            if (fs.lstatSync(nested).isDirectory()) {
                distFolderPath = nested;
                console.log(`Using nested Angular dist: ${subDirs[0]}`);
            }
        }
    }

    // 🔹 Validate index.html
    const indexPath = path.join(distFolderPath, "index.html");
    if (!fs.existsSync(indexPath)) {
        console.error("Invalid build: index.html not found");
        process.exit(1);
    }

    // 🔹 Collect files
    const files = getAllFiles(distFolderPath);

    if (files.length === 0) {
        console.error("Build output is empty");
        process.exit(1);
    }

    console.log(`Uploading ${files.length} files from '${finalOutputDir}'...`);

    // 🔹 Upload in batches to prevent EMFILE or R2 Rate Limit errors
    const CONCURRENCY_LIMIT = 50;
    let failedUploads = 0;

    for (let i = 0; i < files.length; i += CONCURRENCY_LIMIT) {
        const batch = files.slice(i, i + CONCURRENCY_LIMIT);
        
        await Promise.all(
            batch.map(async (file) => {
                const filePath = path.join(distFolderPath, file);
                const bucketKey = `outputs/project_${PROJECT_ID}/deploy_${DEPLOYMENT_ID}/${file.replace(/\\/g, '/')}`;
                const isAsset = /\.(js|css|png|jpg|jpeg|svg|gif|woff|woff2)$/.test(file);

                const command = new PutObjectCommand({
                    Bucket: BUCKET_NAME,
                    Key: bucketKey,
                    Body: fs.createReadStream(filePath),
                    // send in stream instead of whole file.
                    ContentType: mime.lookup(filePath) || 'application/octet-stream',
                    CacheControl: isAsset
                        ? 'public, max-age=31536000, immutable'
                        : 'no-cache'
                });

                try {
                    await s3Client.send(command);
                    console.log(`Uploaded: ${file}`);
                } catch (error) {
                    console.error(`Failed: ${file} → ${error.message}`);
                    failedUploads++;
                }
            })
        );
    }

    if (failedUploads > 0) {
        console.error(`Deployment Failed: ${failedUploads} files failed to upload to R2.`);
        process.exit(1); // Fail the build so the database knows it errored!
    }

    console.log(`Deployment Complete!`);
    process.exit(0);
}

init();