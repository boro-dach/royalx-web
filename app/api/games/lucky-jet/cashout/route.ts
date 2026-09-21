import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/shared/lib/supabase/admin";
import { requireActiveUser } from "@/shared/lib/auth/require-user";
import { multiplierAtElapsedMs } from "@/shared/lib/games/crash";

export async function POST(req: NextRequest) {
  const initData = req.headers.get("x-telegram-init-data");
  const uid = await requireActiveUser(initData);
  if (!uid)
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const roundId = body?.roundId;
  if (typeof roundId !== "number") {
    return NextResponse.json({ error: "INVALID_INPUT" }, { status: 400 });
  }

  const { data: round, error: fetchError } = await supabaseAdmin
    .from("game_rounds")
    .select("id, user_id, bet, status, result, created_at")
    .eq("id", roundId)
    .maybeSingle();

  if (fetchError || !round || round.user_id !== uid) {
    return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  }
  if (round.status !== "pending") {
    return NextResponse.json({ error: "ALREADY_RESOLVED" }, { status: 409 });
  }

  const crashPoint = round.result.crash_point as number;
  const elapsedMs = Date.now() - new Date(round.created_at).getTime();
  const currentMultiplier = multiplierAtElapsedMs(elapsedMs);

  if (currentMultiplier >= crashPoint) {
    await supabaseAdmin
      .from("game_rounds")
      .update({
        status: "completed",
        payout: 0,
        finished_at: new Date().toISOString(),
      })
      .eq("id", roundId);

    return NextResponse.json({ error: "CRASHED", crashPoint }, { status: 400 });
  }

  const payoutCents = Math.round(round.bet * currentMultiplier);

  const { data, error } = await supabaseAdmin.rpc("resolve_crash_round", {
    p_round_id: roundId,
    p_user_id: uid,
    p_payout_amount: payoutCents,
    p_multiplier: currentMultiplier,
  });

  if (error) {
    console.error("[lucky-jet/cashout] rpc error", error);
    return NextResponse.json({ error: "DB_ERROR" }, { status: 500 });
  }

  return NextResponse.json({
    won: true,
    multiplier: currentMultiplier,
    payoutCents,
    balanceCents: data[0].new_balance,
  });
}
