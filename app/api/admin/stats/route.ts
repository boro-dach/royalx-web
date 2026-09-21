import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/shared/lib/supabase/admin";
import { requireAdmin } from "@/shared/lib/auth/require-admin";

export async function GET(req: NextRequest) {
  const adminId = await requireAdmin(req);
  if (!adminId) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  // 1. Total users
  const { count: totalUsers } = await supabaseAdmin
    .from("users")
    .select("id", { count: "exact", head: true });

  // 2. Banned users
  const { count: bannedUsers } = await supabaseAdmin
    .from("users")
    .select("id", { count: "exact", head: true })
    .eq("is_banned", true);

  // 3. Verified users
  const { count: verifiedUsers } = await supabaseAdmin
    .from("users")
    .select("id", { count: "exact", head: true })
    .eq("kyc_status", "approved");

  // 4. Pending KYC
  const { count: pendingKycUsers } = await supabaseAdmin
    .from("users")
    .select("id", { count: "exact", head: true })
    .eq("kyc_status", "pending");

  // 5. Total balance across wallets
  const { data: wallets } = await supabaseAdmin
    .from("wallets")
    .select("balance");

  const totalBalanceCents = wallets?.reduce((sum, w) => sum + (w.balance || 0), 0) ?? 0;

  // 6. Total rounds
  const { count: totalRounds } = await supabaseAdmin
    .from("game_rounds")
    .select("id", { count: "exact", head: true });

  // 7. Custom RTP overrides count
  const { count: customRtpCount } = await supabaseAdmin
    .from("rtp_overrides")
    .select("id", { count: "exact", head: true })
    .not("user_id", "is", null);

  return NextResponse.json({
    totalUsers: totalUsers ?? 0,
    bannedUsers: bannedUsers ?? 0,
    verifiedUsers: verifiedUsers ?? 0,
    pendingKycUsers: pendingKycUsers ?? 0,
    totalBalanceCents,
    totalRounds: totalRounds ?? 0,
    customRtpCount: customRtpCount ?? 0,
  });
}
