import { Redis } from "ioredis";

export const connectRedis = (redisURI: string) => {
  const redis = new Redis(redisURI);

  redis.on("connect", () => console.log("Redis Connected"));
  redis.on("error", (e) => console.log("error to connect redies:", e));

  return redis;
};

// TODO