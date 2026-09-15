import { NextRequest, NextResponse } from "next/server";

import { supabaseAdmin } from "@/shared/lib/supabase/admin";
import { createSession } from "@/shared/lib/auth/session";
import {
  InitDataError,
  verifyTelegramInitData,
} from "@/shared/lib/telegram/verify-init-data";
import { rateLimit } from "@/shared/lib/rate-limit";

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for") ?? "unknown";
  const { allowed } = await rateLimit(`auth:${ip}`, {
    limit: 10,
    windowSec: 60,
  });
  if (!allowed) {
    return NextResponse.json({ error: "TOO_MANY_REQUESTS" }, { status: 429 });
  }

  const body = await req.json().catch(() => null);
  const initData = body?.initData;

  if (typeof initData !== "string" || !initData) {
    return NextResponse.json({ error: "NO_INIT_DATA" }, { status: 400 });
  }

  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  if (!botToken) {
    console.error("[auth/telegram] TELEGRAM_BOT_TOKEN is not set");
    return NextResponse.json(
      { error: "SERVER_MISCONFIGURED" },
      { status: 500 },
    );
  }

  let verified;
  try {
    verified = verifyTelegramInitData(initData, botToken);
  } catch (e) {
    console.error("[auth/telegram] auth failed", e);
    return NextResponse.json({ error: "INVALID_INIT_DATA" }, { status: 401 });
  }

  const { id, username, first_name } = verified.user;

  const { data: existingUser } = await supabaseAdmin
    .from("users")
    .select("is_banned")
    .eq("id", id)
    .maybeSingle();

  if (existingUser?.is_banned) {
    return NextResponse.json({ error: "ACCOUNT_BANNED" }, { status: 403 });
  }

  const { error: userError } = await supabaseAdmin
    .from("users")
    .upsert(
      { id, username, first_name, last_seen_at: new Date().toISOString() },
      { onConflict: "id" },
    );

  if (userError) {
    console.error("[auth/telegram] upsert failed", userError);
    return NextResponse.json({ error: "DB_ERROR" }, { status: 500 });
  }

  await supabaseAdmin
    .from("wallets")
    .upsert({ user_id: id }, { onConflict: "user_id", ignoreDuplicates: true });

  await createSession(id);

  return NextResponse.json({ ok: true, userId: id });
}
