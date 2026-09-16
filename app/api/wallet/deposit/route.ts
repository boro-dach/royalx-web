import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/shared/lib/supabase/admin";
import { requireActiveUser } from "@/shared/lib/auth/require-user";

const MAX_DEMO_AMOUNT_CENTS = 1_000_000; // $10,000 — просто разумный потолок для демки

export async function POST(req: NextRequest) {
  const initData = req.headers.get("x-telegram-init-data");
  const uid = await requireActiveUser(initData);
  if (!uid) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const amountCents = body?.amountCents;

  if (
    typeof amountCents !== "number" ||
    !Number.isInteger(amountCents) ||
    amountCents <= 0
  ) {
    return NextResponse.json({ error: "INVALID_AMOUNT" }, { status: 400 });
  }
  if (amountCents > MAX_DEMO_AMOUNT_CENTS) {
    return NextResponse.json({ error: "AMOUNT_TOO_LARGE" }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin.rpc("record_wallet_transaction", {
    p_user_id: uid,
    p_type: "deposit",
    p_amount: amountCents,
    p_currency: "USD",
  });

  if (error) {
    console.error("[wallet/deposit] rpc error", error);
    return NextResponse.json({ error: "DB_ERROR" }, { status: 500 });
  }

  return NextResponse.json({ balanceCents: data[0].new_balance });
}
