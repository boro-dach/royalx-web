import crypto from "crypto";
import { z } from "zod";

const TelegramUserSchema = z.object({
  id: z.number(),
  username: z.string().optional(),
  first_name: z.string(),
  last_name: z.string().optional(),
  photo_url: z.string().optional(),
});

export type TelegramUser = z.infer<typeof TelegramUserSchema>;

const MAX_AUTH_AGE_SECONDS = 60 * 60 * 24; // 24 часа

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

  if (!hash) throw new InitDataError("MISSING_HASH");

  params.delete("hash");

  const dataCheckString = [...params.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
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

  if (!valid) throw new InitDataError("BAD_SIGNATURE");

  const authDate = Number(params.get("auth_date"));
  if (!authDate || Date.now() / 1000 - authDate > MAX_AUTH_AGE_SECONDS) {
    throw new InitDataError("EXPIRED");
  }

  const userRaw = params.get("user");
  if (!userRaw) throw new InitDataError("NO_USER");

  const parsed = TelegramUserSchema.safeParse(JSON.parse(userRaw));
  if (!parsed.success) throw new InitDataError("BAD_USER_SHAPE");

  return { user: parsed.data };
}
