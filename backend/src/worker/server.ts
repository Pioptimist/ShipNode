import { Worker } from 'bullmq';
import { redis } from '../lib/redis.js';
import { processDeploymentJob } from './processor.js';

console.log("Initializing ShipNode Worker Process...");

//  Worker that constantly listens to the "deployments" queue
const worker = new Worker('deployments', async (job) => {
    // Every single time a job pops out of the queue, hand it to the processor we just built!
    await processDeploymentJob(job);
}, { connection: redis });

// Handle when the processor finishes gracefully
worker.on('completed', job => {
    console.log(`[Worker] Success! Job ${job.id} completed. Sandbox died gracefully.`);
});

// Handle when the processor crashes (or upload fails)
worker.on('failed', (job, err) => {
    console.log(`[Worker] Error! Job ${job?.id} crashed or failed to deploy.`);
    console.log(`Detailed Reason: ${err.message}`);
});

console.log("Worker is actively listening to Redis queue 'deployments'...");