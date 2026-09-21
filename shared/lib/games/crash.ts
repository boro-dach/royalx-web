import { deriveFloat } from "./provably-fair";

const GROWTH_RATE = 0.00006;

export function multiplierAtElapsedMs(elapsedMs: number): number {
  const raw = Math.exp(GROWTH_RATE * elapsedMs);
  return Math.max(1, Math.floor(raw * 100) / 100);
}

export function deriveCrashPoint(
  serverSeed: string,
  clientSeed: string,
  nonce: number,
  rtp: number,
): number {
  const r = deriveFloat(serverSeed, clientSeed, nonce);
  const safeR = r === 0 ? 1e-9 : r;
  const raw = rtp / (1 - safeR);
  return Math.max(1, Math.floor(raw * 100) / 100);
}
