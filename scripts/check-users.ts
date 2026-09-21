import "dotenv/config";
import { supabaseAdmin } from "../shared/lib/supabase/admin";

async function main() {
  const { data: users, error: uErr } = await supabaseAdmin.from("users").select("*");
  console.log("CURRENT USERS IN DB:", users, uErr);

  const { data: wallets, error: wErr } = await supabaseAdmin.from("wallets").select("*");
  console.log("CURRENT WALLETS IN DB:", wallets, wErr);

  const { data: txs, error: txErr } = await supabaseAdmin.from("transactions").select("*").limit(10);
  console.log("RECENT TRANSACTIONS IN DB:", txs, txErr);
}

main().catch(console.error);
