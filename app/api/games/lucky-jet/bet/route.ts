import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/shared/lib/supabase/admin";
import { requireActiveUser } from "@/shared/lib/auth/require-user";
import { rateLimit } from "@/shared/lib/rate-limit";

import { deriveCrashPoint } from "@/shared/lib/games/crash";
import {
  generateServerSeed,
  hashServerSeed,
} from "@/shared/lib/games/provably-fair";

export async function POST(req: NextRequest) {
  const initData = req.headers.get("x-telegram-init-data");
  const uid = await requireActiveUser(initData);
  if (!uid)
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });

  const { allowed } = await rateLimit("game", `lucky-jet:${uid}`);
  if (!allowed)
    return NextResponse.json({ error: "TOO_MANY_REQUESTS" }, { status: 429 });

  const body = await req.json().catch(() => null);
  const { betAmountCents, clientSeed } = body ?? {};

  if (
    typeof betAmountCents !== "number" ||
    !Number.isInteger(betAmountCents) ||
    betAmountCents <= 0 ||
    typeof clientSeed !== "string" ||
    !clientSeed
  ) {
    return NextResponse.json({ error: "INVALID_INPUT" }, { status: 400 });
  }

  const { data: game } = await supabaseAdmin
    .from("games")
    .select("min_bet, max_bet, active")
    .eq("code", "lucky_jet")
    .maybeSingle();

  if (!game?.active)
    return NextResponse.json({ error: "GAME_UNAVAILABLE" }, { status: 403 });
  if (betAmountCents < game.min_bet || betAmountCents > game.max_bet) {
    return NextResponse.json({ error: "BET_OUT_OF_RANGE" }, { status: 400 });
  }

  const { data: existingPending } = await supabaseAdmin
    .from("game_rounds")
    .select("id")
    .eq("user_id", uid)
    .eq("game", "lucky_jet")
    .eq("status", "pending")
    .maybeSingle();

  if (existingPending) {
    return NextResponse.json(
      { error: "ROUND_ALREADY_ACTIVE" },
      { status: 409 },
    );
  }

  const { data: rtp } = await supabaseAdmin.rpc("resolve_rtp", {
    p_game_code: "lucky_jet",
    p_user_id: uid,
  });
  if (rtp == null)
    return NextResponse.json({ error: "DB_ERROR" }, { status: 500 });

  const serverSeed = generateServerSeed();
  const serverSeedHash = hashServerSeed(serverSeed);
  const nonce = 0;
  const crashPoint = deriveCrashPoint(
    serverSeed,
    clientSeed,
    nonce,
    Number(rtp),
  );

  const { data, error } = await supabaseAdmin.rpc("start_crash_round", {
    p_user_id: uid,
    p_game: "lucky_jet",
    p_bet_amount: betAmountCents,
    p_rtp: rtp,
    p_server_seed: serverSeed,
    p_server_seed_hash: serverSeedHash,
    p_client_seed: clientSeed,
    p_nonce: nonce,
    p_crash_point: crashPoint,
  });

  if (error) {
    if (error.message?.includes("INSUFFICIENT_FUNDS")) {
      return NextResponse.json(
        { error: "INSUFFICIENT_FUNDS" },
        { status: 400 },
      );
    }
    console.error("[lucky-jet/bet] rpc error", error);
    return NextResponse.json({ error: "DB_ERROR" }, { status: 500 });
  }

  return NextResponse.json({
    roundId: data[0].round_id,
    serverSeedHash,
    balanceCents: data[0].new_balance,
    startedAt: data[0].started_at,
  });
}
