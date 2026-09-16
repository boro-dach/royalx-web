"use client";

import { useEffect, useState } from "react";

export function AuthGate({ children }: { children: React.ReactNode }) {
  const [inTelegram, setInTelegram] = useState<boolean | null>(null);

  useEffect(() => {
    const tg = window?.Telegram?.WebApp;
    if (tg) {
      tg.ready();
      setInTelegram(!!tg.initData);
    } else {
      setInTelegram(false);
    }
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
