import { redis } from "./redisClient.js";

export const withCache = async <T>(
	key: string,
	ttl: number,
	fn: () => Promise<T>,
): Promise<T> => {
	try {
		const cached = await redis.get(key);
		if (cached) return JSON.parse(cached) as T;
	} catch {
		// cache miss or corrupted data – fall through to fetch
	}

	const data = await fn();

	redis.set(key, JSON.stringify(data), "EX", ttl).catch(() => {});

	return data;
};
