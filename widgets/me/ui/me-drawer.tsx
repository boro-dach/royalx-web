"use client";

import { splitMoney } from "@/entities/profile/lib/format-money";
import { useProfile } from "@/entities/profile/model/use-profile";
import {
  useTransactions,
  type Transaction,
} from "@/entities/wallet/model/use-transactions";
import { useWalletDialogs } from "@/entities/wallet/model/wallet-dialog-context";
import { Button } from "@/shared/ui/button";
import { ButtonGroup } from "@/shared/ui/button-group";
import {
  Drawer,
  DrawerContent,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/shared/ui/drawer";
import { Cog, Coins, Headset, ScrollText, User } from "lucide-react";

const TYPE_LABELS: Record<Transaction["type"], string> = {
  deposit: "Депозит",
  withdraw: "Вывод",
  bet: "Ставка",
  win: "Выигрыш",
};

function TransactionHistoryDrawer({ children }: { children: React.ReactNode }) {
  const { data: transactions, isLoading } = useTransactions();

  return (
    <Drawer>
      <DrawerTrigger asChild>{children}</DrawerTrigger>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle className="text-left text-xl">
            История платежей
          </DrawerTitle>
        </DrawerHeader>
        <div className="flex flex-col gap-2 p-4 pb-8 overflow-y-auto max-h-[60vh]">
          {isLoading && <p className="text-zinc-400">Загрузка...</p>}
          {!isLoading && transactions?.length === 0 && (
            <p className="text-zinc-400">Пока пусто</p>
          )}
          {transactions?.map((tx) => {
            const { whole, fraction } = splitMoney(Math.abs(tx.amount));
            const isPositive = tx.amount > 0;
            return (
              <div
                key={tx.id}
                className="flex justify-between items-center py-2 border-b border-zinc-800 last:border-b-0"
              >
                <div className="flex flex-col">
                  <span className="font-medium">{TYPE_LABELS[tx.type]}</span>
                  <span className="text-xs text-zinc-400">
                    {new Date(tx.created_at).toLocaleString("ru-RU")}
                  </span>
                </div>
                <span
                  className={isPositive ? "text-green-500" : "text-red-500"}
                >
                  {isPositive ? "+" : "-"}${whole}.{fraction}
                </span>
              </div>
            );
          })}
        </div>
      </DrawerContent>
    </Drawer>
  );
}

export default function MeDrawer() {
  const { data: profile, isLoading } = useProfile();
  const balance = profile ? splitMoney(profile.balanceCents) : null;
  const { openDeposit, openWithdraw } = useWalletDialogs();

  return (
    <Drawer>
      <DrawerTrigger asChild>
        <Button variant={"ghost"} size={"icon-lg"}>
          <User className="size-6" />
        </Button>
      </DrawerTrigger>
      <DrawerContent className="flex flex-col justify-start w-full">
        <DrawerHeader>
          <DrawerTitle className="text-left text-xl">Профиль</DrawerTitle>
        </DrawerHeader>
        <DrawerFooter className="flex flex-col w-full gap-6">
          <div className="flex flex-row items-center gap-4">
            <div className="h-12 w-12 rounded-full bg-zinc-400"></div>
            <div className="flex flex-col gap-1">
              <p>{isLoading ? "..." : profile?.displayName}</p>
              <p className="text-zinc-400 text-sm">
                ID: {isLoading ? "..." : profile?.id}
              </p>
            </div>
          </div>
          <div className="flex flex-col gap-1">
            <p className="">Баланс</p>
            <p className="text-xl font-bold text-zinc-400">
              {isLoading || !balance ? (
                "..."
              ) : (
                <>
                  <span className="text-primary">${balance.whole}</span>.
                  {balance.fraction}
                </>
              )}
            </p>
          </div>
          <div className="grid grid-cols-2 gap-2 grid-rows-1">
            <Button
              variant={"secondary"}
              className="font-bold hover:bg-primary"
              onClick={openDeposit}
            >
              Депозит
            </Button>
            <Button
              variant={"secondary"}
              className="font-bold hover:bg-primary"
              onClick={openWithdraw}
            >
              Вывод
            </Button>
          </div>
          <div className="flex flex-col gap-2">
            <ButtonGroup className="w-full flex flex-col border border-primary/40 rounded-lg">
              <Button
                variant="outline"
                className="flex flex-row items-center justify-start gap-4 text-left w-full h-12"
              >
                <Coins className="size-6" />
                <div className="flex flex-col">
                  <p className="font-bold">История ставок</p>
                  <p className="text-zinc-400">Открытые и рассчитаные</p>
                </div>
              </Button>
              <TransactionHistoryDrawer>
                <Button
                  variant="outline"
                  className="flex flex-row items-center justify-start gap-4 text-left w-full h-12"
                >
                  <ScrollText className="size-6" />
                  <div className="flex flex-col">
                    <p className="font-bold">История платежей</p>
                    <p className="text-zinc-400">Статусы депозитов и выводов</p>
                  </div>
                </Button>
              </TransactionHistoryDrawer>
            </ButtonGroup>
            <ButtonGroup className="w-full flex flex-col border border-primary/40 rounded-lg">
              <Button
                variant="outline"
                className="flex flex-row items-center justify-start gap-4 text-left w-full h-12"
              >
                <Cog className="size-6" />
                <div className="flex flex-col">
                  <p className="font-bold">Настройки</p>
                  <p className="text-zinc-400">Редактирование личных данных</p>
                </div>
              </Button>
              <Button
                variant="outline"
                className="flex flex-row items-center justify-start gap-4 text-left w-full h-12"
              >
                <Headset className="size-6" />
                <div className="flex flex-col">
                  <p className="font-bold">Поддержка</p>
                  <p className="text-zinc-400"></p>
                </div>
              </Button>
            </ButtonGroup>
          </div>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
