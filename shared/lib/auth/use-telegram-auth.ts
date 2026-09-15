"use client";

import { useEffect, useState } from "react";

type AuthStatus = "loading" | "ok" | "error";

export function useTelegramAuth() {
  const [status, setStatus] = useState<AuthStatus>("loading");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const tg = window?.Telegram?.WebApp;

    if (!tg) {
      setStatus("error");
      setError("NOT_IN_TELEGRAM");
      return;
    }

    tg.ready();

    const initData = tg.initData;
    if (!initData) {
      setStatus("error");
      setError("NO_INIT_DATA");
      return;
    }

    fetch("/api/auth/telegram", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ initData }),
    })
      .then(async (res) => {
        if (res.ok) {
          setStatus("ok");
        } else {
          const body = await res.json().catch(() => ({}));
          setStatus("error");
          setError(body.error ?? "UNKNOWN");
        }
      })
      .catch(() => {
        setStatus("error");
        setError("NETWORK_ERROR");
      });
  }, []);

  return { status, error };
}
