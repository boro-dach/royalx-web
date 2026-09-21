import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/shared/lib/supabase/admin";
import { requireAdmin } from "@/shared/lib/auth/require-admin";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  const adminId = await requireAdmin(req);
  if (!adminId) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  const { code } = await params;
  if (!code) {
    return NextResponse.json({ error: "INVALID_GAME_CODE" }, { status: 400 });
  }

  const body = await req.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: "INVALID_BODY" }, { status: 400 });
  }

  const { name, defaultRtp, minBetCents, maxBetCents, active } = body;

  const updates: {
    name?: string;
    default_rtp?: number;
    min_bet?: number;
    max_bet?: number;
    active?: boolean;
  } = {};

  if (typeof name === "string" && name.trim()) {
    updates.name = name.trim();
  }
  if (typeof defaultRtp === "number" && defaultRtp > 0 && defaultRtp <= 2.0) {
    updates.default_rtp = defaultRtp;
  }
  if (typeof minBetCents === "number" && minBetCents > 0) {
    updates.min_bet = Math.round(minBetCents);
  }
  if (typeof maxBetCents === "number" && maxBetCents > 0) {
    updates.max_bet = Math.round(maxBetCents);
  }
  if (typeof active === "boolean") {
    updates.active = active;
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "NO_UPDATES" }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from("games")
    .update(updates)
    .eq("code", code)
    .select()
    .single();

  if (error || !data) {
    console.error("[admin/games/code] update error", error);
    return NextResponse.json({ error: "UPDATE_GAME_FAILED" }, { status: 500 });
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

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  const adminId = await requireAdmin(req);
  if (!adminId) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  const { code } = await params;
  if (!code) {
    return NextResponse.json({ error: "INVALID_GAME_CODE" }, { status: 400 });
  }

  // Delete game
  const { error } = await supabaseAdmin.from("games").delete().eq("code", code);

  if (error) {
    console.error("[admin/games/code] delete error", error);
    return NextResponse.json({ error: "DELETE_GAME_FAILED" }, { status: 500 });
  }

  // Also clean up any rtp overrides for this game code
  await supabaseAdmin.from("rtp_overrides").delete().eq("game_code", code);

  return NextResponse.json({ success: true, deletedCode: code });
}
