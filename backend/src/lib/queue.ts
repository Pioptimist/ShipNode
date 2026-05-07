import { Queue } from 'bullmq';
import { redis } from './redis.js';

// the Queue that the API will push jobs into
export const deployQueue = new Queue('deployments', {
    connection: redis,
    defaultJobOptions: {
        attempts: 1, 
        backoff: {
            type: 'exponential',
            delay: 3000, // Waits 3s, then 9s, then 27s
        },
        removeOnComplete: true, 
        removeOnFail: false     
    }
});

// Define the exact shape of the Job Data we expect from the Webhook
export interface DeployJobData {
    projectId: string;
    deploymentId: number;
    repoUrl: string;
    commitHash: string;
    rootDir: string;
    installCmd: string;
    buildCmd: string;
    outputDir: string;
    isProduction: boolean;
    
}
