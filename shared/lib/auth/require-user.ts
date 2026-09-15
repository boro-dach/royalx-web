import { supabaseAdmin } from "@/shared/lib/supabase/admin";
import { getSessionUserId } from "./session";

export async function requireActiveUser(): Promise<number | null> {
  const uid = await getSessionUserId();
  if (!uid) return null;

  const { data } = await supabaseAdmin
    .from("users")
    .select("is_banned")
    .eq("id", uid)
    .maybeSingle();

  if (!data || data.is_banned) return null;

  return uid;
}
