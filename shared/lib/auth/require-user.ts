import { supabaseAdmin } from "@/shared/lib/supabase/admin";
import { verifyTelegramInitData, InitDataError } from "@/shared/lib/telegram/verify-init-data";
import { fetchTelegramAvatarBuffer } from "@/shared/lib/telegram/fetch-avatar";

const AVATAR_REFRESH_INTERVAL_MS = 24 * 60 * 60 * 1000;

async function refreshAvatarIfStale(userId: number, photoUrlFromInitData: string | undefined) {
  const { data: user } = await supabaseAdmin
    .from("users")
    .select("avatar_url, avatar_updated_at")
    .eq("id", userId)
    .maybeSingle();

  const isStale =
    !user?.avatar_updated_at ||
    Date.now() - new Date(user.avatar_updated_at).getTime() > AVATAR_REFRESH_INTERVAL_MS;

  if (!isStale) return;

  // источник 1: initData.photo_url, если Telegram его дал (attachment menu launch)
  if (photoUrlFromInitData) {
    await supabaseAdmin
      .from("users")
      .update({ avatar_url: photoUrlFromInitData, avatar_updated_at: new Date().toISOString() })
      .eq("id", userId);
    return;
  }

  // источник 2: Bot API
  const botToken = process.env.TELEGRAM_BOT_TOKEN!;
  const photo = await fetchTelegramAvatarBuffer(userId, botToken);

  if (!photo) {
    // нет фото профиля — фиксируем момент проверки, чтобы не долбить Bot API каждый запрос
    await supabaseAdmin
      .from("users")
      .update({ avatar_updated_at: new Date().toISOString() })
      .eq("id", userId);
    return;
  }

  const ext = photo.contentType.includes("png") ? "png" : "jpg";
  const path = `${userId}.${ext}`;

  const { error: uploadError } = await supabaseAdmin.storage
    .from("avatars")
    .upload(path, photo.buffer, { contentType: photo.contentType, upsert: true });

  if (uploadError) {
    console.error("[avatar] upload error", uploadError);
    return;
  }

  const { data: publicUrl } = supabaseAdmin.storage.from("avatars").getPublicUrl(path);

  await supabaseAdmin
    .from("users")
    .update({ avatar_url: publicUrl.publicUrl, avatar_updated_at: new Date().toISOString() })
    .eq("id", userId);
}

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

  const { id, username, first_name, photo_url } = verified.user;

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

  // не блокируем ответ на скачивание аватарки — делаем это в фоне
  refreshAvatarIfStale(id, photo_url).catch((e) =>
    console.error("[avatar] refresh failed", e),
  );

  return data.id;
}
