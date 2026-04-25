import { Redis, RedisOptions } from "ioredis";

// Strongly type the configuration object
const redisOptions: RedisOptions = {
  host: "127.0.0.1",
  port: 6379,
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