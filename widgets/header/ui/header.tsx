"use client";

import { useProfile } from "@/entities/profile/model/use-profile";
import { splitMoney } from "@/entities/profile/lib/format-money";
import { Button } from "@/shared/ui/button";
import { Plus } from "lucide-react";
import { useWalletDialogs } from "@/entities/wallet/model/wallet-dialog-context";

export default function Header() {
  const { data: profile, isLoading } = useProfile();
  const { openDeposit } = useWalletDialogs();

  const balance = profile ? splitMoney(profile.balanceCents) : null;

  return (
    <header className="h-12 sticky top-4 flex flex-row items-center justify-between">
      <h1 className="text-xl font-bold">
        Приятной игры, {isLoading ? "..." : profile?.displayName || "гость"}
      </h1>
      <div className="flex flex-row items-center gap-2 border rounded-md px-2 py-1">
        <span className="text-sm font-medium">
          {isLoading || !balance ? (
            "..."
          ) : (
            <>
              ${balance.whole}.{balance.fraction}
            </>
          )}
        </span>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          onClick={openDeposit}
        >
          <Plus className="size-4" />
        </Button>
      </div>
    </header>
  );
}
