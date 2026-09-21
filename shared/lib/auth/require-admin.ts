import { NextRequest } from "next/server";
import { requireActiveUser } from "./require-user";
import { Redis } from "@upstash/redis";

const DEFAULT_ADMIN_IDS = [8970354031, 999999001];
const REDIS_ADMINS_KEY = "royalx:admin_user_ids";

let redisClient: Redis | null = null;
function getRedis(): Redis | null {
  if (!redisClient && process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
    redisClient = Redis.fromEnv();
  }
  return redisClient;
}

export function getDefaultAdminIds(): number[] {
  const envIds = process.env.ADMIN_USER_IDS;
  if (!envIds) return DEFAULT_ADMIN_IDS;
  const parsed = envIds
    .split(",")
    .map((s) => parseInt(s.trim(), 10))
    .filter((n) => !isNaN(n));
  return Array.from(new Set([...DEFAULT_ADMIN_IDS, ...parsed]));
}

export async function getAdminUserIds(): Promise<number[]> {
  const defaults = getDefaultAdminIds();
  const redis = getRedis();
  if (!redis) return defaults;

  try {
    const members = await redis.smembers(REDIS_ADMINS_KEY);
    const redisIds = members.map((m) => parseInt(String(m), 10)).filter((n) => !isNaN(n));
    return Array.from(new Set([...defaults, ...redisIds]));
  } catch (e) {
    console.error("[getAdminUserIds] redis error", e);
    return defaults;
  }
}

export async function isUserAdmin(userId: number): Promise<boolean> {
  const defaults = getDefaultAdminIds();
  if (defaults.includes(userId)) return true;

  const redis = getRedis();
  if (!redis) return false;

  try {
    const isMember = await redis.sismember(REDIS_ADMINS_KEY, userId);
    return Boolean(isMember);
  } catch (e) {
    console.error("[isUserAdmin] redis error", e);
    return false;
  }
}

export async function setAdminStatus(userId: number, makeAdmin: boolean): Promise<void> {
  const redis = getRedis();
  if (!redis) {
    console.warn("[setAdminStatus] Redis unavailable, cannot persist admin status");
    return;
  }

  try {
    if (makeAdmin) {
      await redis.sadd(REDIS_ADMINS_KEY, userId);
    } else {
      await redis.srem(REDIS_ADMINS_KEY, userId);
    }
  } catch (e) {
    console.error("[setAdminStatus] redis error", e);
    throw new Error("FAILED_TO_SET_ADMIN");
  }
}

export async function requireAdmin(req: NextRequest): Promise<number | null> {
  // Option 1: Direct admin secret key header
  const adminKey = req.headers.get("x-admin-key");
  const configuredSecret = process.env.ADMIN_SECRET_KEY || "royalx_admin_secret_2026";
  if (adminKey && adminKey === configuredSecret) {
    return 999999001;
  }

  // Option 2: Telegram initData
  const initData = req.headers.get("x-telegram-init-data");
  const uid = await requireActiveUser(initData);
  if (!uid) return null;

  const isAdmin = await isUserAdmin(uid);
  if (!isAdmin) {
    console.warn(`[requireAdmin] User ${uid} is not an admin`);
    return null;
  }

  return uid;
}
