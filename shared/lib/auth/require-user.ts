import { supabaseAdmin } from "@/shared/lib/supabase/admin";
import {
  verifyTelegramInitData,
  InitDataError,
} from "@/shared/lib/telegram/verify-init-data";

export async function requireActiveUser(
  initDataRaw: string | null,
): Promise<number | null> {
  if (!initDataRaw) return null;

  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  if (!botToken) {
    console.error("[requireActiveUser] TELEGRAM_BOT_TOKEN is not set");
    return null;
  }

  let verified;
  try {
    verified = verifyTelegramInitData(initDataRaw, botToken);
  } catch (e) {
    console.warn(
      "[requireActiveUser] invalid initData",
      e instanceof InitDataError ? e.code : e,
    );
    return null;
  }

  const { id, username, first_name } = verified.user;

  const { data, error } = await supabaseAdmin
    .from("users")
    .upsert(
      { id, username, first_name, last_seen_at: new Date().toISOString() },
      { onConflict: "id" },
    )
    .select("id, is_banned")
    .single();

  if (error) {
    console.error("[requireActiveUser] db error", error);
    return null;
  }

  if (data.is_banned) {
    console.warn("[requireActiveUser] banned", { id });
    return null;
  }

  return data.id;
}
