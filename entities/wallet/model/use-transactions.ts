"use client";

import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/shared/lib/telegram/api-fetch";

export type Transaction = {
  id: string;
  type: "deposit" | "withdraw" | "bet" | "win";
  amount: number;
  currency: string;
  status: string;
  created_at: string;
};

export function useTransactions() {
  return useQuery<Transaction[]>({
    queryKey: ["transactions"],
    queryFn: async () => {
      const res = await apiFetch("/api/transactions");
      if (!res.ok) throw new Error("FAILED_TO_LOAD_TRANSACTIONS");
      const body = await res.json();
      return body.transactions;
    },
  });
}
