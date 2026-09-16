import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/shared/lib/supabase/admin";
import { requireActiveUser } from "@/shared/lib/auth/require-user";

export async function GET(req: NextRequest) {
  const initData = req.headers.get("x-telegram-init-data");
  const uid = await requireActiveUser(initData);
  if (!uid) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  const { data: user, error: userError } = await supabaseAdmin
    .from("users")
    .select("id, username, first_name, last_name")
    .eq("id", uid)
    .maybeSingle();

  if (userError || !user) {
    return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  }

  const { data: wallet, error: walletError } = await supabaseAdmin
    .from("wallets")
    .select("balance, currency")
    .eq("user_id", uid)
    .maybeSingle();

  if (walletError) {
    return NextResponse.json({ error: "DB_ERROR" }, { status: 500 });
  }

  return NextResponse.json({
    id: user.id,
    displayName:
      [user.first_name, user.last_name].filter(Boolean).join(" ") ||
      user.username ||
      "Игрок",
    balanceCents: wallet?.balance ?? 0,
    currency: wallet?.currency ?? "USD",
  });
}
