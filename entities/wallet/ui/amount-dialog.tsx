"use client";

import { useState } from "react";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/shared/ui/dialog";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  onConfirm: (amountCents: number) => void;
  isPending: boolean;
  error?: string | null;
};

export function AmountDialog({
  open,
  onOpenChange,
  title,
  onConfirm,
  isPending,
  error,
}: Props) {
  const [value, setValue] = useState("");

  const handleConfirm = () => {
    const dollars = Number(value);
    if (!Number.isFinite(dollars) || dollars <= 0) return;
    onConfirm(Math.round(dollars * 100));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <Input
          type="number"
          placeholder="Сумма, $"
          value={value}
          onChange={(e) => setValue(e.target.value)}
        />
        {error && <p className="text-sm text-red-500">{error}</p>}
        <DialogFooter>
          <Button onClick={handleConfirm} disabled={isPending}>
            {isPending ? "..." : "Подтвердить"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
