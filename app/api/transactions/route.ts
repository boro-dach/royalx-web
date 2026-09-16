import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/shared/lib/supabase/admin";
import { requireActiveUser } from "@/shared/lib/auth/require-user";

export async function GET(req: NextRequest) {
  const initData = req.headers.get("x-telegram-init-data");
  const uid = await requireActiveUser(initData);
  if (!uid) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const limit = Math.min(Number(searchParams.get("limit")) || 20, 50);

  const { data, error } = await supabaseAdmin
    .from("transactions")
    .select("id, type, amount, currency, status, created_at")
    .eq("user_id", uid)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("[transactions] db error", error);
    return NextResponse.json({ error: "DB_ERROR" }, { status: 500 });
  }

  return NextResponse.json({ transactions: data });
}
