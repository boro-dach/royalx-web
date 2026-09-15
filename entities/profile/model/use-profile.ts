"use client";

import { useQuery } from "@tanstack/react-query";

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
      const res = await fetch("/api/me");
      if (!res.ok) throw new Error("FAILED_TO_LOAD_PROFILE");
      return res.json();
    },
    staleTime: 30_000,
  });
}
