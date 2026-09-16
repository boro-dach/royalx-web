"use client";

import { useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthGate } from "./auth-gate";
import { WalletDialogsProvider } from "@/entities/wallet/model/wallet-dialog-context";

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: { queries: { staleTime: 30_000, retry: 1 } },
      }),
  );

  return (
    <QueryClientProvider client={queryClient}>
      <AuthGate>
        <WalletDialogsProvider>{children}</WalletDialogsProvider>
      </AuthGate>
    </QueryClientProvider>
  );
}
