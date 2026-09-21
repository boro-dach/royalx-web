import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/shared/lib/supabase/admin";
import { requireActiveUser } from "@/shared/lib/auth/require-user";
import { isUserAdmin } from "@/shared/lib/auth/require-admin";

export async function GET(req: NextRequest) {
  const initData = req.headers.get("x-telegram-init-data");
  const uid = await requireActiveUser(initData);
  if (!uid) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  const { data: user, error: userError } = await supabaseAdmin
    .from("users")
    .select("id, username, first_name, avatar_url, kyc_status")
    .eq("id", uid)
    .maybeSingle();

  if (userError) {
    console.error("[api/me] user select error", userError);
    return NextResponse.json({ error: "DB_ERROR" }, { status: 500 });
  }
  if (!user) {
    console.warn("[api/me] user not found", { uid });
    return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  }

  const { data: wallet, error: walletError } = await supabaseAdmin
    .from("wallets")
    .select("balance")
    .eq("user_id", uid)
    .maybeSingle();

  if (walletError) {
    console.error("[api/me] wallet select error", walletError);
    return NextResponse.json({ error: "DB_ERROR" }, { status: 500 });
  }

  return NextResponse.json({
    id: user.id,
    displayName: user.first_name || user.username || "Игрок",
    username: user.username ?? null,
    avatarUrl: user.avatar_url ?? null,
    balanceCents: wallet?.balance ?? 0,
    currency: "USD",
    kycStatus: user.kyc_status ?? "none",
    isAdmin: await isUserAdmin(uid),
  });
}
