import crypto from "crypto";
import { z } from "zod";

const TelegramUserSchema = z
  .object({
    id: z.coerce.number(),
    username: z.string().nullish(),
    first_name: z.string().nullish().default(""),
    last_name: z.string().nullish(),
    photo_url: z.string().nullish(),
    language_code: z.string().nullish(),
    is_premium: z.boolean().nullish(),
    allows_write_to_pm: z.boolean().nullish(),
  })
  .passthrough();

export type TelegramUser = z.infer<typeof TelegramUserSchema>;

const MAX_AUTH_AGE_SECONDS =
  Number(process.env.TELEGRAM_INIT_DATA_MAX_AGE) || 60 * 60 * 24 * 30; // 30 дней

export class InitDataError extends Error {
  constructor(public code: string) {
    super(code);
  }
}

export function verifyTelegramInitData(
  initData: string,
  botToken: string,
): { user: TelegramUser } {
  const params = new URLSearchParams(initData);
  const hash = params.get("hash");

  if (!hash || !/^[0-9a-f]{64}$/.test(hash)) throw new InitDataError("BAD_HASH");

  params.delete("hash");

  const dataCheckString = [...params.entries()]
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([k, v]) => `${k}=${v}`)
    .join("\n");

  const secretKey = crypto
    .createHmac("sha256", "WebAppData")
    .update(botToken)
    .digest();

  const computedHash = crypto
    .createHmac("sha256", secretKey)
    .update(dataCheckString)
    .digest("hex");

  const valid = crypto.timingSafeEqual(
    Buffer.from(computedHash, "hex"),
    Buffer.from(hash, "hex"),
  );

  if (!valid) {
    console.warn("[verifyTelegramInitData] signature mismatch");
    throw new InitDataError("BAD_SIGNATURE");
  }

  const authDate = Number(params.get("auth_date"));
  if (!authDate || Date.now() / 1000 - authDate > MAX_AUTH_AGE_SECONDS) {
    const ageSeconds = authDate ? Math.round(Date.now() / 1000 - authDate) : null;
    console.warn(
      `[verifyTelegramInitData] auth_date expired. authDate=${authDate}, age=${ageSeconds}s, maxAge=${MAX_AUTH_AGE_SECONDS}s`,
    );
    throw new InitDataError("EXPIRED");
  }

  const userRaw = params.get("user");
  if (!userRaw) throw new InitDataError("NO_USER");

  let parsedJson: unknown;
  try {
    parsedJson = JSON.parse(userRaw);
  } catch (err) {
    console.warn("[verifyTelegramInitData] failed to parse user JSON:", userRaw, err);
    throw new InitDataError("MALFORMED_USER_JSON");
  }

  const parsed = TelegramUserSchema.safeParse(parsedJson);
  if (!parsed.success) {
    console.warn(
      "[verifyTelegramInitData] BAD_USER_SHAPE:",
      JSON.stringify(parsed.error.format()),
      "raw:",
      userRaw,
    );
    throw new InitDataError("BAD_USER_SHAPE");
  }

  return { user: parsed.data };
}
