"use client";

import { splitMoney } from "@/entities/profile/lib/format-money";
import {
  useTransactions,
  type Transaction,
} from "@/entities/wallet/model/use-transactions";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/shared/ui/drawer";

const TYPE_LABELS: Record<Transaction["type"], string> = {
  deposit: "Депозит",
  withdraw: "Вывод",
  bet: "Ставка",
  win: "Выигрыш",
};

export function TransactionHistoryDrawer({
  children,
}: {
  children: React.ReactNode;
}) {
  const { data: transactions, isLoading } = useTransactions();

  return (
    <Drawer>
      <DrawerTrigger asChild>{children}</DrawerTrigger>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>История платежей</DrawerTitle>
        </DrawerHeader>
        <div className="flex flex-col gap-2 p-4 overflow-y-auto max-h-[60vh]">
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
                className="flex justify-between items-center py-2 border-b border-zinc-800"
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
