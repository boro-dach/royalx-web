"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { apiFetch } from "@/shared/lib/telegram/api-fetch";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/shared/ui/button";

const GROWTH_RATE = 0.00006;

function multiplierAtElapsedMs(elapsedMs: number): number {
  const raw = Math.exp(GROWTH_RATE * elapsedMs);
  return Math.max(1, Math.floor(raw * 100) / 100);
}

type RoundState = "idle" | "flying" | "crashed" | "cashed_out";

export default function LuckyJetPage() {
  const [state, setState] = useState<RoundState>("idle");
  const [multiplier, setMultiplier] = useState(1);
  const [betAmount, setBetAmount] = useState(1000);
  const [roundId, setRoundId] = useState<number | null>(null);
  const [lastResult, setLastResult] = useState<{
    won: boolean;
    value: number;
  } | null>(null);
  const startedAtRef = useRef<number | null>(null);
  const rafRef = useRef<number | null>(null);
  const queryClient = useQueryClient();

  const tick = useCallback(() => {
    if (!startedAtRef.current) return;
    const elapsed = Date.now() - startedAtRef.current;
    setMultiplier(multiplierAtElapsedMs(elapsed));
    rafRef.current = requestAnimationFrame(tick);
  }, []);

  const startRound = async () => {
    setLastResult(null);
    const clientSeed = crypto.randomUUID();
    const res = await apiFetch("/api/games/lucky-jet/bet", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ betAmountCents: betAmount, clientSeed }),
    });
    const body = await res.json();
    if (!res.ok) {
      alert(body.error ?? "Ошибка");
      return;
    }
    setRoundId(body.roundId);
    startedAtRef.current = new Date(body.startedAt).getTime();
    setState("flying");
    rafRef.current = requestAnimationFrame(tick);
  };

  const cashout = async () => {
    if (!roundId) return;
    if (rafRef.current) cancelAnimationFrame(rafRef.current);

    const res = await apiFetch("/api/games/lucky-jet/cashout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ roundId }),
    });
    const body = await res.json();

    if (!res.ok) {
      setState("crashed");
      setMultiplier(body.crashPoint ?? multiplier);
      setLastResult({ won: false, value: body.crashPoint ?? multiplier });
    } else {
      setState("cashed_out");
      setMultiplier(body.multiplier);
      setLastResult({ won: true, value: body.multiplier });
    }
    setRoundId(null);
    queryClient.invalidateQueries({ queryKey: ["me"] });
  };

  useEffect(
    () => () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    },
    [],
  );

  const curvePoints = (() => {
    const points: string[] = [];
    const steps = 40;
    for (let i = 0; i <= steps; i++) {
      const frac = i / steps;
      const x = frac * 100;
      const y =
        100 -
        Math.pow(frac, 1.6) *
          (state === "idle" ? 0 : Math.min(90, (multiplier - 1) * 30));
      points.push(`${x},${y}`);
    }
    return points.join(" ");
  })();

  return (
    // 1. Изменено на h-[100dvh] (или h-dvh) и добавлен overflow-hidden
    <div className="flex flex-col w-full h-[100dvh] overflow-hidden bg-zinc-950 text-white p-4 gap-4">
      {/* 2. Убран min-h-[320px], добавлен min-h-0 чтобы блок мог сжиматься */}
      <div className="relative flex-1 min-h-0 rounded-2xl bg-gradient-to-b from-indigo-950 to-zinc-950 overflow-hidden border border-white/10">
        <svg
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          className="absolute inset-0 w-full h-full"
        >
          <polyline
            points={curvePoints}
            fill="none"
            stroke={state === "crashed" ? "rgb(244 63 94)" : "rgb(168 85 247)"}
            strokeWidth="1.5"
            vectorEffect="non-scaling-stroke"
          />
          {state === "flying" && (
            <circle
              cx="90"
              cy={100 - Math.min(90, (multiplier - 1) * 30)}
              r="2"
              className="fill-primary"
            />
          )}
        </svg>

        <div className="absolute inset-0 flex items-center justify-center">
          <span
            className={
              state === "crashed"
                ? "text-5xl font-black text-destructive"
                : "text-5xl font-black text-primary"
            }
          >
            x{multiplier.toFixed(2)}
          </span>
        </div>

        {lastResult && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 px-4 py-2 rounded-xl bg-black/60 text-sm whitespace-nowrap">
            {lastResult.won
              ? `Вывод x${lastResult.value.toFixed(2)}`
              : `Крash на x${lastResult.value.toFixed(2)}`}
          </div>
        )}
      </div>

      {/* 3. Добавлен shrink-0 чтобы панель кнопок не сжималась при маленьком экране */}
      <div className="flex flex-col shrink-0 gap-2 rounded-2xl bg-zinc-900 p-3">
        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="icon"
            onClick={() => setBetAmount((v) => Math.max(100, v - 100))}
          >
            −
          </Button>
          <div className="flex-1 text-center font-bold">
            ${(betAmount / 100).toFixed(2)}
          </div>
          <Button
            variant="secondary"
            size="icon"
            onClick={() => setBetAmount((v) => v + 100)}
          >
            +
          </Button>
        </div>

        {state === "flying" ? (
          <Button
            className="font-bold bg-destructive hover:bg-destructive/90"
            onClick={cashout}
          >
            ЗАБРАТЬ x{multiplier.toFixed(2)}
          </Button>
        ) : (
          <Button className="font-bold" onClick={startRound}>
            СТАВКА
          </Button>
        )}
      </div>
    </div>
  );
}
