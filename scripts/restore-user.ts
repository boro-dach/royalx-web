import "dotenv/config";
import { supabaseAdmin } from "../shared/lib/supabase/admin";
import { setAdminStatus } from "../shared/lib/auth/require-admin";

async function main() {
  const userId = 8970354031;
  const username = "MartinCartier";
  const firstName = "Martin";
  const balanceCents = 3300; // $33.00

  console.log(`Restoring user ${userId} (${username})...`);

  const { data: user, error: userError } = await supabaseAdmin
    .from("users")
    .upsert(
      {
        id: userId,
        username,
        first_name: firstName,
        display_name: username,
        is_banned: false,
        kyc_status: "none",
        last_seen_at: new Date().toISOString(),
      },
      { onConflict: "id" }
    )
    .select("*")
    .single();

  if (userError) {
    console.error("Failed to restore user:", userError);
    process.exit(1);
  }
  console.log("Restored user row:", user);

  const { data: wallet, error: walletError } = await supabaseAdmin
    .from("wallets")
    .upsert(
      {
        user_id: userId,
        balance: balanceCents,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" }
    )
    .select("*")
    .single();

  if (walletError) {
    console.error("Failed to restore wallet:", walletError);
    process.exit(1);
  }
  console.log("Restored wallet row:", wallet);

  // Ensure admin rights in Redis
  await setAdminStatus(userId, true);
  console.log(`Ensured admin status in Redis for ${userId}`);

  console.log("User restoration completed successfully!");
}

main().catch(console.error);
