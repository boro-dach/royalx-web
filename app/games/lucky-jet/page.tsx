"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { apiFetch } from "@/shared/lib/telegram/api-fetch";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/shared/ui/button";
import { multiplierAtElapsedMs } from "@/shared/lib/games/crash";

type RoundState = "idle" | "flying" | "crashed" | "cashed_out";

export default function LuckyJetPage() {
  const [state, setState] = useState<RoundState>("idle");
  const [multiplier, setMultiplier] = useState(1);
  const [betAmount, setBetAmount] = useState(1000);
  const [roundId, setRoundId] = useState<number | null>(null);
  const [isStarting, setIsStarting] = useState(false);
  const [lastResult, setLastResult] = useState<{
    won: boolean;
    value: number;
  } | null>(null);

  const roundIdRef = useRef<number | null>(null);
  const crashPointRef = useRef<number | null>(null);
  const startedAtRef = useRef<number | null>(null);
  const rafRef = useRef<number | null>(null);
  const queryClient = useQueryClient();

  const tick = useCallback(() => {
    if (!startedAtRef.current) return;
    const elapsed = Date.now() - startedAtRef.current;
    const currentMult = multiplierAtElapsedMs(elapsed);

    // Real-time crash detection
    if (crashPointRef.current && currentMult >= crashPointRef.current) {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      const finalCrash = crashPointRef.current;
      setMultiplier(finalCrash);
      setState("crashed");
      setLastResult({ won: false, value: finalCrash });

      const activeRoundId = roundIdRef.current;
      roundIdRef.current = null;
      setRoundId(null);
      crashPointRef.current = null;

      if (activeRoundId) {
        apiFetch("/api/games/lucky-jet/cashout", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ roundId: activeRoundId }),
        }).catch(() => {});
      }
      queryClient.invalidateQueries({ queryKey: ["me"] });
      return;
    }

    setMultiplier(currentMult);
    rafRef.current = requestAnimationFrame(tick);
  }, [queryClient]);

  const startRound = async () => {
    if (isStarting || state === "flying") return;
    setIsStarting(true);
    setLastResult(null);
    try {
      const clientSeed = crypto.randomUUID();
      const res = await apiFetch("/api/games/lucky-jet/bet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ betAmountCents: betAmount, clientSeed }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        alert(body.error ?? "Ошибка");
        return;
      }
      setRoundId(body.roundId);
      roundIdRef.current = body.roundId;
      crashPointRef.current = body.crashPoint;
      startedAtRef.current = new Date(body.startedAt).getTime();
      setMultiplier(1);
      setState("flying");
      rafRef.current = requestAnimationFrame(tick);
    } finally {
      setIsStarting(false);
    }
  };

  const cashout = async () => {
    if (!roundId || state !== "flying") return;
    if (rafRef.current) cancelAnimationFrame(rafRef.current);

    const activeRoundId = roundId;
    roundIdRef.current = null;
    setRoundId(null);

    const res = await apiFetch("/api/games/lucky-jet/cashout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ roundId: activeRoundId }),
    });
    const body = await res.json().catch(() => ({}));

    if (!res.ok) {
      setState("crashed");
      const crashVal = body.crashPoint ?? crashPointRef.current ?? multiplier;
      setMultiplier(crashVal);
      setLastResult({ won: false, value: crashVal });
    } else {
      setState("cashed_out");
      setMultiplier(body.multiplier);
      setLastResult({ won: true, value: body.multiplier });
    }
    crashPointRef.current = null;
    queryClient.invalidateQueries({ queryKey: ["me"] });
  };

  useEffect(() => {
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  const { curvePoints, areaPoints, tip } = (() => {
    const startX = 4;
    const startY = 88;
    const cruisingX = 75;
    const cruisingY = 25;

    // At initial idle before any round, show dot resting at launchpad
    if (state === "idle" && !lastResult) {
      return {
        curvePoints: "",
        areaPoints: "",
        tip: { x: startX, y: startY },
      };
    }

    // Flight progress based on multiplier starting from 1.00
    const progress = Math.min(
      1,
      Math.max(0, 1 - Math.exp(-(multiplier - 1) * 1.5)),
    );

    const tipX = startX + progress * (cruisingX - startX);
    const tipY = startY - progress * (startY - cruisingY);

    const steps = 30;
    const curveXY: { x: number; y: number }[] = [];

    for (let i = 0; i <= steps; i++) {
      const frac = i / steps;
      const x = startX + frac * (tipX - startX);
      const y = startY - Math.pow(frac, 1.8) * (startY - tipY);
      curveXY.push({ x, y });
    }

    const curvePoints = curveXY
      .map((p) => `${p.x.toFixed(2)},${p.y.toFixed(2)}`)
      .join(" ");

    const areaPoints =
      progress > 0.005
        ? [
            `${startX},${startY}`,
            ...curveXY.map((p) => `${p.x.toFixed(2)},${p.y.toFixed(2)}`),
            `${tipX.toFixed(2)},${startY}`,
          ].join(" ")
        : "";

    return {
      curvePoints,
      areaPoints,
      tip: { x: tipX, y: tipY },
    };
  })();

  return (
    <div className="flex flex-col w-full h-dvh overflow-hidden bg-zinc-950 text-white p-4 gap-4">
      <div className="relative flex-1 min-h-0 rounded-2xl bg-linear-to-b from-indigo-950 to-zinc-950 overflow-hidden border border-white/10">
        <svg
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          className="absolute inset-0 w-full h-full pointer-events-none"
        >
          <defs>
            <linearGradient id="jetAreaGrad" x1="0" y1="0" x2="0" y2="1">
              <stop
                offset="0%"
                stopColor={
                  state === "crashed" ? "rgb(244 63 94)" : "rgb(168 85 247)"
                }
                stopOpacity="0.35"
              />
              <stop
                offset="100%"
                stopColor={
                  state === "crashed" ? "rgb(244 63 94)" : "rgb(168 85 247)"
                }
                stopOpacity="0.0"
              />
            </linearGradient>
          </defs>

          {areaPoints && (
            <polygon points={areaPoints} fill="url(#jetAreaGrad)" />
          )}

          {curvePoints && (
            <polyline
              points={curvePoints}
              fill="none"
              stroke={
                state === "crashed"
                  ? "rgb(244 63 94)"
                  : state === "cashed_out"
                    ? "rgb(52 211 153)"
                    : "rgb(168 85 247)"
              }
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              vectorEffect="non-scaling-stroke"
            />
          )}
        </svg>

        {/* Circle indicator on takeoff / flight line */}
        <div
          className="absolute pointer-events-none -translate-x-1/2 -translate-y-1/2 z-10"
          style={{ left: `${tip.x}%`, top: `${tip.y}%` }}
        >
          {state === "flying" && (
            <div className="absolute inset-0 size-6 -translate-x-1/2 -translate-y-1/2 top-1/2 left-1/2 rounded-full bg-purple-500/40 animate-ping" />
          )}
          <div
            className={`size-3.5 rounded-full border-2 shadow-lg transition-colors duration-150 ${
              state === "crashed"
                ? "bg-rose-500 border-rose-200 shadow-rose-500/60"
                : state === "cashed_out"
                  ? "bg-emerald-400 border-white shadow-emerald-500/60"
                  : state === "flying"
                    ? "bg-purple-400 border-white shadow-purple-500/60"
                    : "bg-purple-500/60 border-purple-300 shadow-purple-500/30"
            }`}
          />
        </div>

        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span
            className={
              state === "crashed"
                ? "text-5xl font-black text-destructive"
                : state === "cashed_out"
                  ? "text-5xl font-black text-emerald-400"
                  : "text-5xl font-black text-primary"
            }
          >
            x{multiplier.toFixed(2)}
          </span>
          {state === "crashed" && (
            <span className="text-xs font-bold uppercase tracking-widest text-rose-500/90 mt-1">
              Улетел!
            </span>
          )}
        </div>

        {lastResult && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 px-4 py-2 rounded-xl bg-black/70 backdrop-blur-xs border border-white/10 text-sm whitespace-nowrap z-20">
            {lastResult.won
              ? `Вывод x${lastResult.value.toFixed(2)}`
              : `Краш на x${lastResult.value.toFixed(2)}`}
          </div>
        )}
      </div>

      <div className="flex flex-col shrink-0 gap-2 rounded-2xl bg-zinc-900 p-3">
        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="icon"
            onClick={() => setBetAmount((v) => Math.max(100, v - 100))}
            disabled={state === "flying" || isStarting}
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
            disabled={state === "flying" || isStarting}
          >
            +
          </Button>
        </div>

        {state === "flying" ? (
          <Button
            className="font-bold bg-destructive hover:bg-destructive/90 transition-transform active:scale-95"
            onClick={cashout}
          >
            ЗАБРАТЬ x{multiplier.toFixed(2)}
          </Button>
        ) : (
          <Button
            className="font-bold transition-transform active:scale-95"
            onClick={startRound}
            disabled={isStarting}
          >
            {isStarting ? "СТАРТ..." : "СТАВКА"}
          </Button>
        )}
      </div>
    </div>
  );
}
