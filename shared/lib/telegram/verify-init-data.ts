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
  constructor(public code: string, public details?: unknown) {
    super(code);
  }
}

export function verifyTelegramInitData(
  initData: string,
  botToken: string,
): { user: TelegramUser } {
  const cleanBotToken = botToken.replace(/^["'\s]+|["'\s]+$/g, "");
  const params = new URLSearchParams(initData);
  const hash = params.get("hash");

  if (!hash || !/^[0-9a-f]{64}$/.test(hash)) throw new InitDataError("BAD_HASH");

  params.delete("hash");
  // Важно: Telegram Bot API 7.7+ добавляет third-party signature, её нужно исключить из HMAC
  params.delete("signature");

  const pairs: string[] = [];
  params.forEach((value, key) => {
    pairs.push(`${key}=${value}`);
  });
  pairs.sort();
  const dataCheckString = pairs.join("\n");

  const secretKey = crypto
    .createHmac("sha256", "WebAppData")
    .update(cleanBotToken)
    .digest();

  const computedHash = crypto
    .createHmac("sha256", secretKey)
    .update(dataCheckString)
    .digest("hex");

  let valid = crypto.timingSafeEqual(
    Buffer.from(computedHash, "hex"),
    Buffer.from(hash, "hex"),
  );

  // Фолбэк-проверка: если клиент передал сырые query-string параметры без URLSearchParams-декодирования
  if (!valid) {
    const rawPairs: string[] = [];
    for (const part of initData.split("&")) {
      const eqIdx = part.indexOf("=");
      if (eqIdx === -1) continue;
      const k = part.slice(0, eqIdx);
      const v = part.slice(eqIdx + 1);
      if (k === "hash" || k === "signature") continue;
      rawPairs.push(`${k}=${v}`);
    }
    rawPairs.sort();
    const rawDataCheckString = rawPairs.join("\n");
    const rawComputedHash = crypto
      .createHmac("sha256", secretKey)
      .update(rawDataCheckString)
      .digest("hex");
    if (
      crypto.timingSafeEqual(
        Buffer.from(rawComputedHash, "hex"),
        Buffer.from(hash, "hex"),
      )
    ) {
      valid = true;
    }
  }

  if (!valid) {
    console.warn("[verifyTelegramInitData] signature mismatch", {
      tokenPrefix: cleanBotToken.slice(0, 10),
      keys: [...params.keys()],
      receivedHashPrefix: hash.slice(0, 10),
      computedHashPrefix: computedHash.slice(0, 10),
      dataCheckStringLength: dataCheckString.length,
    });
    throw new InitDataError("BAD_SIGNATURE", {
      tokenPrefix: cleanBotToken.slice(0, 10),
      keys: [...params.keys()],
      receivedHashPrefix: hash.slice(0, 10),
      computedHashPrefix: computedHash.slice(0, 10),
    });
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
