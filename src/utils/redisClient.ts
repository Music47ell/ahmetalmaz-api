import Redis from "ioredis";

export const redis =
  process.env.REDIS_URL
    ? new Redis(process.env.REDIS_URL, {
        maxRetriesPerRequest: 5,
      })
    : {
        get: async () => null,
        set: async () => {},
        keys: async () => [],
        pipeline: () => ({ exec: async () => [] }),
      };

// catch unhandled Redis errors
if (process.env.REDIS_URL) {
  redis.on("error", (err) => {
    console.error("[Redis] error:", err);
  });
}
