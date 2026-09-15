"use client";

import { useTelegramAuth } from "@/shared/lib/auth/use-telegram-auth";

export function AuthGate({ children }: { children: React.ReactNode }) {
  const { status, error } = useTelegramAuth();

  if (status === "loading") {
    return (
      <div className="flex h-screen items-center justify-center">
        <span className="text-zinc-400">Загрузка...</span>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="flex h-screen items-center justify-center px-6 text-center">
        <p className="text-zinc-400">
          {error === "NOT_IN_TELEGRAM"
            ? "Откройте приложение через Telegram"
            : "Не удалось авторизоваться. Попробуйте перезайти."}
        </p>
      </div>
    );
  }

  return <>{children}</>;
}
