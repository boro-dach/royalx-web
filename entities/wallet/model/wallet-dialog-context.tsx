"use client";

import { createContext, useContext, useState } from "react";
import { useDeposit, useWithdraw } from "./use-wallet-mutations";
import { AmountDialog } from "@/shared/ui/amount-dialog";

type WalletDialogsContextValue = {
  openDeposit: () => void;
  openWithdraw: () => void;
};

const WalletDialogsContext = createContext<WalletDialogsContextValue | null>(
  null,
);

export function WalletDialogsProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [depositOpen, setDepositOpen] = useState(false);
  const [withdrawOpen, setWithdrawOpen] = useState(false);

  const deposit = useDeposit();
  const withdraw = useWithdraw();

  return (
    <WalletDialogsContext.Provider
      value={{
        openDeposit: () => setDepositOpen(true),
        openWithdraw: () => setWithdrawOpen(true),
      }}
    >
      {children}

      <AmountDialog
        open={depositOpen}
        onOpenChange={setDepositOpen}
        title="Депозит"
        isPending={deposit.isPending}
        error={deposit.error?.message}
        onConfirm={(cents) =>
          deposit.mutate(cents, { onSuccess: () => setDepositOpen(false) })
        }
      />
      <AmountDialog
        open={withdrawOpen}
        onOpenChange={setWithdrawOpen}
        title="Вывод"
        isPending={withdraw.isPending}
        error={
          withdraw.error?.message === "INSUFFICIENT_FUNDS"
            ? "Недостаточно средств"
            : withdraw.error?.message
        }
        onConfirm={(cents) =>
          withdraw.mutate(cents, { onSuccess: () => setWithdrawOpen(false) })
        }
      />
    </WalletDialogsContext.Provider>
  );
}

export function useWalletDialogs() {
  const ctx = useContext(WalletDialogsContext);
  if (!ctx) {
    throw new Error(
      "useWalletDialogs must be used within WalletDialogsProvider",
    );
  }
  return ctx;
}
