"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/shared/lib/telegram/api-fetch";

async function walletAction(
  endpoint: "deposit" | "withdraw",
  amountCents: number,
) {
  const res = await apiFetch(`/api/wallet/${endpoint}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ amountCents }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? "REQUEST_FAILED");
  }
  return res.json();
}

export function useDeposit() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (amountCents: number) => walletAction("deposit", amountCents),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["me"] });
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
    },
  });
}

export function useWithdraw() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (amountCents: number) => walletAction("withdraw", amountCents),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["me"] });
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
    },
  });
}
