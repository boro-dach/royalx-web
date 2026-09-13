"use client";

import { useEffect, useState } from "react";

export function useTelegramAuth() {
  const [status, setStatus] = useState<"loading" | "ok" | "error">("loading");

  useEffect(() => {
    const initData = window?.Telegram?.WebApp?.initData;

    if (!initData) {
      setStatus("error");
      return;
    }

    fetch("/api/auth/telegram", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ initData }),
    })
      .then((res) => (res.ok ? setStatus("ok") : setStatus("error")))
      .catch(() => setStatus("error"));
  }, []);

  return status;
}
