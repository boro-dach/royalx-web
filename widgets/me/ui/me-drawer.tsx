"use client";

import { splitMoney } from "@/entities/profile/lib/format-money";
import { useProfile } from "@/entities/profile/model/use-profile";
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

export default function MeDrawer() {
  const { data: profile, isLoading } = useProfile();

  const balance = profile ? splitMoney(profile.balanceCents) : null;

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
            >
              Депозит
            </Button>
            <Button
              variant={"secondary"}
              className="font-bold hover:bg-primary"
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
