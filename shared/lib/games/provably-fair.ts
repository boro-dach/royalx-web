import crypto from "crypto";

export function generateServerSeed(): string {
  return crypto.randomBytes(32).toString("hex");
}

export function hashServerSeed(serverSeed: string): string {
  return crypto.createHash("sha256").update(serverSeed).digest("hex");
}

export function deriveFloat(
  serverSeed: string,
  clientSeed: string,
  nonce: number,
): number {
  const hmac = crypto
    .createHmac("sha256", serverSeed)
    .update(`${clientSeed}:${nonce}`)
    .digest("hex");

  const intVal = parseInt(hmac.slice(0, 8), 16);
  return intVal / 0xffffffff;
}
