// shared/lib/auth/require-user.ts
import { supabaseAdmin } from "@/shared/lib/supabase/admin";
import { getSessionUserId } from "./session";

export async function requireActiveUser(): Promise<number | null> {
  const uid = await getSessionUserId();
  if (!uid) {
    console.warn("[requireActiveUser] no valid session");
    return null;
  }

  const { data, error } = await supabaseAdmin
    .from("users")
    .select("is_banned")
    .eq("id", uid)
    .maybeSingle();

  if (error) {
    console.error("[requireActiveUser] db error", error);
    return null;
  }

  if (!data) {
    console.warn("[requireActiveUser] user not found", { uid });
    return null;
  }

  if (data.is_banned) {
    console.warn("[requireActiveUser] banned", { uid });
    return null;
  }

  return uid;
}
