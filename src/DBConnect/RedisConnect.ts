import { Redis } from "ioredis";

export const connectRedis = (redisURI: string) => {
  const redis = new Redis(redisURI);

  redis.on("connect", () => console.log("Redis Connected"));
  redis.on("error", (e) => console.log("error to connect redies:", e));

  return redis;
};

// TODO
// import { createClient } from 'redis';

// export const connectRedis = async () => {
// const client = createClient({
//     username: 'default',
//     password: '<your password>',
//     socket: {
//         host: 'your hostname',
//         port: <your port>
//     }
// });

// client.on('error', err => console.log('Redis Client Error', err));

// const redis=await client.connect();
// return redis
// }



