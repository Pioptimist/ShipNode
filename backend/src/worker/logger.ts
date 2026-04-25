import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { ENV } from '../lib/env.js';
import redis from '../lib/redis.js';

const s3Client = new S3Client({
    region: 'auto',
    endpoint: ENV.R2_ENDPOINT,
    credentials: {
        accessKeyId: ENV.R2_ACCESS_KEY_ID,
        secretAccessKey: ENV.R2_SECRET_ACCESS_KEY
    }
});

export class DeploymentLogger {
    private logsBuffer: string = '';
    private projectId: string;
    private deploymentId: string;

    constructor(projectId: string, deploymentId: string) {
        this.projectId = projectId;
        this.deploymentId = deploymentId;
    }

    public appendLog(chunk: string | Buffer) {
        const textChunk = chunk.toString('utf8');
        this.logsBuffer += textChunk;
        
        // Publish real-time chunk to Redis so API Socket servers can broadcast it
        redis.publish(`logs:${this.deploymentId}`, JSON.stringify({ log: textChunk })).catch(() => {
            // Ignore Redis publish failures to prevent crashing the worker
        });
    }

    public async uploadToStorage(): Promise<string> {
        const logKey = `outputs/project_${this.projectId}/logs/deploy_${this.deploymentId}.log`;
        
        const command = new PutObjectCommand({
            Bucket: ENV.R2_BUCKET_NAME,
            Key: logKey,
            Body: this.logsBuffer,
            ContentType: 'text/plain'
        });

        await s3Client.send(command);
        
        return logKey;
    }
}
