import crypto from "crypto";
import "dotenv/config";

const botToken = process.env.TELEGRAM_BOT_TOKEN;
if (!botToken) {
  console.error(
    "Set TELEGRAM_BOT_TOKEN in your env before running this script",
  );
  process.exit(1);
}

const fakeUser = {
  id: 999999001,
  first_name: "Dev",
  last_name: "Tester",
  username: "dev_tester",
};

function buildInitData(botToken: string): string {
  const params = new URLSearchParams();
  params.set("query_id", "AAH" + crypto.randomBytes(8).toString("hex"));
  params.set("user", JSON.stringify(fakeUser));
  params.set("auth_date", String(Math.floor(Date.now() / 1000)));

  const dataCheckString = [...params.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}=${v}`)
    .join("\n");

  const secretKey = crypto
    .createHmac("sha256", "WebAppData")
    .update(botToken)
    .digest();
  const hash = crypto
    .createHmac("sha256", secretKey)
    .update(dataCheckString)
    .digest("hex");

  params.set("hash", hash);
  return params.toString();
}

const initData = buildInitData(botToken);
console.log("\nAdd this to your .env.local:\n");
console.log(`NEXT_PUBLIC_DEV_INIT_DATA="${initData}"\n`);
