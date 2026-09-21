import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/shared/lib/supabase/admin";
import { requireAdmin } from "@/shared/lib/auth/require-admin";

export async function GET(req: NextRequest) {
  const adminId = await requireAdmin(req);
  if (!adminId) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  const { data: games, error } = await supabaseAdmin
    .from("games")
    .select("code, name, default_rtp, min_bet, max_bet, active")
    .order("name", { ascending: true });

  if (error) {
    console.error("[admin/games] get games error", error);
    return NextResponse.json({ error: "DB_ERROR" }, { status: 500 });
  }

  const formatted = games?.map((g) => ({
    code: g.code,
    name: g.name,
    defaultRtp: g.default_rtp,
    minBetCents: g.min_bet,
    maxBetCents: g.max_bet,
    active: Boolean(g.active),
  })) ?? [];

  return NextResponse.json({ games: formatted });
}

export async function POST(req: NextRequest) {
  const adminId = await requireAdmin(req);
  if (!adminId) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: "INVALID_BODY" }, { status: 400 });
  }

  const { code, name, defaultRtp, minBetCents, maxBetCents, active } = body;

  if (
    typeof code !== "string" ||
    !code.trim() ||
    typeof name !== "string" ||
    !name.trim()
  ) {
    return NextResponse.json({ error: "CODE_AND_NAME_REQUIRED" }, { status: 400 });
  }

  const cleanCode = code.trim().toLowerCase().replace(/[^a-z0-9_]/g, "_");
  const rtp = typeof defaultRtp === "number" && defaultRtp > 0 ? defaultRtp : 0.97;
  const minBet = typeof minBetCents === "number" && minBetCents > 0 ? minBetCents : 100;
  const maxBet = typeof maxBetCents === "number" && maxBetCents >= minBet ? maxBetCents : 100000;
  const isActive = active !== undefined ? Boolean(active) : true;

  const { data, error } = await supabaseAdmin
    .from("games")
    .insert({
      code: cleanCode,
      name: name.trim(),
      default_rtp: rtp,
      min_bet: minBet,
      max_bet: maxBet,
      active: isActive,
    })
    .select()
    .single();

  if (error) {
    if (error.code === "23505") {
      return NextResponse.json({ error: "GAME_CODE_ALREADY_EXISTS" }, { status: 409 });
    }
    console.error("[admin/games] create game error", error);
    return NextResponse.json({ error: "CREATE_GAME_FAILED" }, { status: 500 });
  }

  return NextResponse.json({
    game: {
      code: data.code,
      name: data.name,
      defaultRtp: data.default_rtp,
      minBetCents: data.min_bet,
      maxBetCents: data.max_bet,
      active: Boolean(data.active),
    },
  });
}
