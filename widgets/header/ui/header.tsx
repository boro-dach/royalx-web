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
      <div className="flex flex-row items-center gap-2">
        <div className="h-8 w-8 rounded-xl bg-green-400"></div>
        <p className="font-bold">RoyalX</p>
      </div>
      <div className="flex flex-row items-center gap-2 border rounded-md px-2 py-1">
        <img href={profile ? profile.avatar_url : "/"} className="h-6 w-6 rounded-full"/>
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
