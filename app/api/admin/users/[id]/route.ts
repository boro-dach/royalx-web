import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/shared/lib/supabase/admin";
import { requireAdmin, isUserAdmin, setAdminStatus } from "@/shared/lib/auth/require-admin";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const adminId = await requireAdmin(req);
  if (!adminId) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  const { id: paramId } = await params;
  const targetUserId = parseInt(paramId, 10);
  if (isNaN(targetUserId)) {
    return NextResponse.json({ error: "INVALID_USER_ID" }, { status: 400 });
  }

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "INVALID_BODY" }, { status: 400 });
  }

  const {
    isBanned,
    kycStatus,
    balanceCents,
    balanceAdjustmentCents,
    individualRtp,
    isAdmin,
  } = body;

  // 1. Update user table fields (is_banned, kyc_status)
  const userUpdates: { is_banned?: boolean; kyc_status?: string } = {};
  if (typeof isBanned === "boolean") {
    userUpdates.is_banned = isBanned;
  }
  if (
    typeof kycStatus === "string" &&
    ["none", "pending", "approved", "rejected"].includes(kycStatus)
  ) {
    userUpdates.kyc_status = kycStatus;
  }

  if (Object.keys(userUpdates).length > 0) {
    const { error: userUpdateErr } = await supabaseAdmin
      .from("users")
      .update(userUpdates)
      .eq("id", targetUserId);

    if (userUpdateErr) {
      console.error("[admin/users/id] user update error", userUpdateErr);
      return NextResponse.json({ error: "USER_UPDATE_FAILED" }, { status: 500 });
    }
  }

  // 2. Update admin role status
  if (typeof isAdmin === "boolean") {
    await setAdminStatus(targetUserId, isAdmin);
  }

  // 3. Update wallet balance if requested
  if (typeof balanceCents === "number" || typeof balanceAdjustmentCents === "number") {
    const { data: currentWallet } = await supabaseAdmin
      .from("wallets")
      .select("balance")
      .eq("user_id", targetUserId)
      .maybeSingle();

    const currentBalance = currentWallet?.balance ?? 0;
    let newBalance = currentBalance;
    let diff = 0;

    if (typeof balanceCents === "number") {
      newBalance = Math.max(0, Math.round(balanceCents));
      diff = newBalance - currentBalance;
    } else if (typeof balanceAdjustmentCents === "number") {
      newBalance = Math.max(0, currentBalance + Math.round(balanceAdjustmentCents));
      diff = newBalance - currentBalance;
    }

    if (diff !== 0 || !currentWallet) {
      const { error: walletErr } = await supabaseAdmin
        .from("wallets")
        .upsert(
          {
            user_id: targetUserId,
            balance: newBalance,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "user_id" }
        );

      if (walletErr) {
        console.error("[admin/users/id] wallet update error", walletErr);
        return NextResponse.json({ error: "WALLET_UPDATE_FAILED" }, { status: 500 });
      }

      // Record transaction audit
      await supabaseAdmin.from("transactions").insert({
        user_id: targetUserId,
        type: diff > 0 ? "deposit" : "withdraw",
        amount: diff,
        currency: "USD",
        status: "completed",
      });
    }
  }

  // 4. Update individual RTP for the user across ALL games
  if (individualRtp !== undefined) {
    if (individualRtp === null) {
      // Clear individual override for this user across all games
      await supabaseAdmin
        .from("rtp_overrides")
        .delete()
        .eq("user_id", targetUserId);
    } else if (typeof individualRtp === "number" && individualRtp > 0 && individualRtp <= 2.0) {
      // Fetch all games to apply individual RTP across all games for this user
      const { data: allGames } = await supabaseAdmin.from("games").select("code");
      const gameCodes = (allGames && allGames.length > 0)
        ? allGames.map((g) => g.code)
        : ["lucky_jet", "dice", "slots"];

      // Delete existing overrides for this user
      await supabaseAdmin
        .from("rtp_overrides")
        .delete()
        .eq("user_id", targetUserId);

      // Insert override for each game
      const inserts = gameCodes.map((code) => ({
        user_id: targetUserId,
        game_code: code,
        rtp: individualRtp,
        priority: 10,
        created_by: adminId,
        valid_from: new Date().toISOString(),
      }));

      await supabaseAdmin.from("rtp_overrides").insert(inserts);
    }
  }

  // Fetch updated user state to return
  const { data: updatedUser } = await supabaseAdmin
    .from("users")
    .select("id, username, first_name, display_name, avatar_url, created_at, last_seen_at, is_banned, kyc_status")
    .eq("id", targetUserId)
    .single();

  const { data: updatedWallet } = await supabaseAdmin
    .from("wallets")
    .select("balance")
    .eq("user_id", targetUserId)
    .maybeSingle();

  const { data: updatedRtp } = await supabaseAdmin
    .from("rtp_overrides")
    .select("id, user_id, game_code, rtp, priority")
    .eq("user_id", targetUserId)
    .order("priority", { ascending: false })
    .limit(1)
    .maybeSingle();

  const userIsAdmin = await isUserAdmin(targetUserId);

  return NextResponse.json({
    success: true,
    user: {
      id: updatedUser?.id,
      username: updatedUser?.username,
      firstName: updatedUser?.first_name,
      displayName: updatedUser?.display_name || updatedUser?.first_name || updatedUser?.username || `Игрок #${updatedUser?.id}`,
      avatarUrl: updatedUser?.avatar_url,
      createdAt: updatedUser?.created_at,
      lastSeenAt: updatedUser?.last_seen_at,
      isBanned: Boolean(updatedUser?.is_banned),
      kycStatus: updatedUser?.kyc_status ?? "none",
      isAdmin: userIsAdmin,
      balanceCents: updatedWallet?.balance ?? 0,
      individualRtp: updatedRtp ? { rtp: updatedRtp.rtp, gameCode: updatedRtp.game_code, id: updatedRtp.id } : null,
    },
  });
}
