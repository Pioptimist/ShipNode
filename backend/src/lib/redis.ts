import { Redis, RedisOptions } from "ioredis";

// Strongly type the configuration object
const redisOptions: RedisOptions = {

  host: process.env.REDIS_HOST || "127.0.0.1",
  port: process.env.REDIS_PORT ? parseInt(process.env.REDIS_PORT) : 6379,
  family: 4,
  maxRetriesPerRequest: null, // Required for BullMQ
};

export const redis = new Redis(redisOptions);

redis.on("connect", () => {
  console.log("Redis connected");
});

// Type the error parameter
redis.on("error", (err: Error) => {
  console.error("Redis error:", err.message);
});

export default redis;