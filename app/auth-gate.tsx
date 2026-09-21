"use client";

import { useEffect, useState } from "react";
import { getTelegramInitData } from "@/shared/lib/telegram/api-fetch";

export function AuthGate({ children }: { children: React.ReactNode }) {
  const [inTelegram, setInTelegram] = useState<boolean | null>(null);

  useEffect(() => {
    const checkAuth = () => {
      const initData = getTelegramInitData();
      if (initData) {
        window.Telegram?.WebApp?.ready?.();
        setInTelegram(true);
        return true;
      }
      return false;
    };

    if (checkAuth()) return;

    // Retry once in case telegram-web-app.js is still reading the URL hash
    const timer = setTimeout(() => {
      if (!checkAuth()) {
        setInTelegram(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, []);

  if (inTelegram === null) {
    return (
      <div className="flex h-screen items-center justify-center">
        <span className="text-zinc-400">Загрузка...</span>
      </div>
    );
  }

  if (!inTelegram) {
    return (
      <div className="flex h-screen items-center justify-center px-6 text-center">
        <p className="text-zinc-400">Откройте приложение через Telegram</p>
      </div>
    );
  }

  return <>{children}</>;
}
