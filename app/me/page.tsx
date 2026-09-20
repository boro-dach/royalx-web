"use client";

import { splitMoney } from "@/entities/profile/lib/format-money";
import { useProfile } from "@/entities/profile/model/use-profile";
import { Button } from "@/shared/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { ReferralCard } from "@/widgets/referral/ui/referral-card";
import { BadgeCheck, ChevronRight, Cross, Upload, X } from "lucide-react";

export default function MePage() {
  const { data: profile } = useProfile();
  const balance = splitMoney(profile?.balanceCents ?? 0);
  const username = profile?.displayName || "Гость";

  return (
    <div className="flex flex-col w-full p-4 gap-6">
      <h1 className="text-2xl font-bold">Профиль</h1>

      <div className="flex flex-row items-center gap-4 min-w-0">
        {profile?.avatarUrl ? (
          <img
            src={profile.avatarUrl}
            alt={username}
            className="size-20 shrink-0 rounded-xl object-cover"
          />
        ) : (
          <div className="size-20 shrink-0 rounded-xl bg-zinc-400" />
        )}

        <div className="flex flex-col gap-3 min-w-0 flex-1">
          <div className="flex flex-row items-center justify-between gap-2">
            <p className="text-lg font-bold truncate">{username}</p>
            <Button
              variant="secondary"
              className="text-primary bg-accent h-6 shrink-0"
            >
              Статистика
            </Button>
          </div>

          <div className="grid grid-cols-3 divide-x divide-zinc-900">
            <div className="flex flex-col text-center px-2">
              <p className="font-bold">0</p>
              <p className="text-xs text-zinc-400">Сыграно</p>
            </div>
            <div className="flex flex-col text-center px-2">
              <p className="font-bold">0</p>
              <p className="text-xs text-zinc-400">Выиграно</p>
            </div>
            <div className="flex flex-col text-center px-2">
              <p className="font-bold">0</p>
              <p className="text-xs text-zinc-400">Выигрыш</p>
            </div>
          </div>
        </div>
      </div>
      <div className="flex flex-col gap-4 mt-2">
        <p className="text-xl font-bold">Баланс</p>
        <p className="text-4xl font-bold">
          $<span className="text-primary">{balance.whole}</span>.
          {balance.fraction}
        </p>
        <div className="grid grid-cols-2 grid-rows-1 w-full gap-2">
          <Button className="font-bold">Пополнить</Button>
          <Button variant="secondary" className="font-bold">
            Вывести
          </Button>
        </div>
      </div>
      <ReferralCard />
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-blue-400 text-xl">
            <BadgeCheck />
            Верификация
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <p className="flex flex-row items-center gap-1">
            Статус аккаунта:{" "}
            <span className="text-destructive flex flex-row items-center gap-1">
              Не верифицирован
              <X className="size-4 text-destructive" />
            </span>
          </p>
          <p className="text-sm text-zinc-400">
            При выводе средств на сумму 50000₽ и более, потребуется верификация
            аккаунта.
          </p>
          <Button className="font-bold flex flex-row items-center gap-1">
            Пройти верификацию <ChevronRight />
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
