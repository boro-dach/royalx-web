"use client";

import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/shared/lib/telegram/api-fetch";

export type Profile = {
  id: number;
  displayName: string;
  username: string | null;
  avatarUrl: string | null;
  balanceCents: number;
  currency: string;
  kycStatus?: "none" | "pending" | "approved" | "rejected";
  isAdmin?: boolean;
};

export function useProfile() {
  return useQuery<Profile>({
    queryKey: ["me"],
    queryFn: async () => {
      const res = await apiFetch("/api/me");
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        const code = body.code || body.error || `HTTP_${res.status}`;
        const detailsStr = body.details ? ` (${JSON.stringify(body.details)})` : "";
        throw new Error(`${code}${detailsStr}`);
      }
      return res.json();
    },
    enabled: typeof window !== "undefined",
    staleTime: 30_000,
  });
}
