import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/shared/lib/supabase/admin";
import { requireAdmin, getAdminUserIds } from "@/shared/lib/auth/require-admin";

export async function GET(req: NextRequest) {
  const adminId = await requireAdmin(req);
  if (!adminId) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q")?.trim();
  const filter = searchParams.get("filter") ?? "all";
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") ?? "50", 10)));
  const offset = Math.max(0, parseInt(searchParams.get("offset") ?? "0", 10));

  let query = supabaseAdmin
    .from("users")
    .select("id, username, first_name, display_name, avatar_url, created_at, last_seen_at, is_banned, kyc_status", { count: "exact" });

  if (q) {
    const isNum = /^\d+$/.test(q);
    if (isNum) {
      query = query.or(`id.eq.${q},username.ilike.%${q}%,first_name.ilike.%${q}%`);
    } else {
      query = query.or(`username.ilike.%${q}%,first_name.ilike.%${q}%`);
    }
  }

  if (filter === "banned") {
    query = query.eq("is_banned", true);
  } else if (filter === "verified") {
    query = query.eq("kyc_status", "approved");
  } else if (filter === "pending_kyc") {
    query = query.eq("kyc_status", "pending");
  }

  query = query
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  const { data: users, error: usersError, count } = await query;

  if (usersError) {
    console.error("[admin/users] users query error", usersError);
    return NextResponse.json({ error: "DB_ERROR" }, { status: 500 });
  }

  if (!users || users.length === 0) {
    return NextResponse.json({ users: [], total: count ?? 0 });
  }

  const userIds = users.map((u) => u.id);
  const adminIds = await getAdminUserIds();
  const adminSet = new Set(adminIds);

  // Fetch wallets for these users
  const { data: wallets } = await supabaseAdmin
    .from("wallets")
    .select("user_id, balance")
    .in("user_id", userIds);

  const walletMap = new Map<number, number>();
  wallets?.forEach((w) => {
    walletMap.set(w.user_id, w.balance);
  });

  // Fetch active rtp_overrides for these users
  const { data: rtpOverrides } = await supabaseAdmin
    .from("rtp_overrides")
    .select("id, user_id, game_code, rtp, priority")
    .in("user_id", userIds)
    .order("priority", { ascending: false });

  const rtpMap = new Map<number, { rtp: number; gameCode: string | null; id: number }>();
  rtpOverrides?.forEach((override) => {
    if (override.user_id && !rtpMap.has(override.user_id)) {
      rtpMap.set(override.user_id, {
        rtp: override.rtp,
        gameCode: override.game_code,
        id: override.id,
      });
    }
  });

  let enrichedUsers = users.map((u) => ({
    id: u.id,
    username: u.username,
    firstName: u.first_name,
    displayName: u.display_name || u.first_name || u.username || `Игрок #${u.id}`,
    avatarUrl: u.avatar_url,
    createdAt: u.created_at,
    lastSeenAt: u.last_seen_at,
    isBanned: Boolean(u.is_banned),
    kycStatus: u.kyc_status ?? "none",
    isAdmin: adminSet.has(u.id),
    balanceCents: walletMap.get(u.id) ?? 0,
    individualRtp: rtpMap.get(u.id) ?? null,
  }));

  if (filter === "custom_rtp") {
    enrichedUsers = enrichedUsers.filter((u) => u.individualRtp !== null);
  } else if (filter === "admins") {
    enrichedUsers = enrichedUsers.filter((u) => u.isAdmin);
  }

  return NextResponse.json({
    users: enrichedUsers,
    total: count ?? enrichedUsers.length,
  });
}
