"use client";

import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/shared/lib/telegram/api-fetch";

export type Profile = {
  id: number;
  displayName: string;
  balanceCents: number;
  currency: string;
};

export function useProfile() {
  return useQuery<Profile>({
    queryKey: ["me"],
    queryFn: async () => {
      const res = await apiFetch("/api/me");
      if (!res.ok) throw new Error("FAILED_TO_LOAD_PROFILE");
      return res.json();
    },
    enabled:
      typeof window !== "undefined" && !!window?.Telegram?.WebApp?.initData,
    staleTime: 30_000,
  });
}
