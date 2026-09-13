import { NextRequest, NextResponse } from "next/server";
import { verifyTelegramInitData } from "@/shared/lib/telegram/verify-init-data";
import { supabaseAdmin } from "@/shared/lib/supabase/admin";
import { createSession } from "@/shared/lib/auth/session";

export async function POST(req: NextRequest) {
  const { initData } = await req.json();

  if (!initData) {
    return NextResponse.json({ error: "NO_INIT_DATA" }, { status: 400 });
  }

  let verified;
  try {
    verified = verifyTelegramInitData(
      initData,
      process.env.TELEGRAM_BOT_TOKEN!,
    );
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 401 });
  }

  const { id, username, first_name } = verified.user;

  // upsert пользователя
  const { error: userError } = await supabaseAdmin
    .from("users")
    .upsert(
      { id, username, first_name, last_seen_at: new Date().toISOString() },
      { onConflict: "id" },
    );

  if (userError) {
    return NextResponse.json({ error: "DB_ERROR" }, { status: 500 });
  }

  // гарантируем наличие кошелька (как в demo_deposit)
  await supabaseAdmin
    .from("wallets")
    .upsert({ user_id: id }, { onConflict: "user_id", ignoreDuplicates: true });

  await createSession(id);

  return NextResponse.json({ ok: true, userId: id });
}
