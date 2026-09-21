import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

const redis = Redis.fromEnv();

const authLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(10, "60 s"),
  prefix: "rl:auth",
});

const gameLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(30, "60 s"),
  prefix: "rl:game",
});

const walletLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(5, "60 s"),
  prefix: "rl:wallet",
});

export async function rateLimit(
  category: "auth" | "game" | "wallet",
  key: string,
): Promise<{ allowed: boolean; remaining: number }> {
  const limiter =
    category === "auth"
      ? authLimiter
      : category === "game"
        ? gameLimiter
        : walletLimiter;

  const { success, remaining } = await limiter.limit(key);
  return { allowed: success, remaining };
}
