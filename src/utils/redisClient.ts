import Redis from "ioredis";

export const redis =
  process.env.REDIS_URL
    ? new Redis(process.env.REDIS_URL, {
        maxRetriesPerRequest: 5,
      })
    : {
        set: async () => {},
        keys: async () => [],
      };

// catch unhandled Redis errors
if (process.env.REDIS_URL) {
  redis.on("error", (err) => {
    console.error("[Redis] error:", err);
  });
}
