import { Copy, User, Users } from "lucide-react";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/shared/ui/card";

export function ReferralCard() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-primary text-xl">
          <Users className="size-5" />
          Реферальная программа
        </CardTitle>
        <CardDescription>
          Приглашайте рефералов и получайте комиссию с их игр
        </CardDescription>
      </CardHeader>

      <CardContent className="flex items-center divide-x divide-zinc-900">
        <div className="flex items-center gap-2 pr-4">
          <span className="text-sm text-zinc-400">Рефералов:</span>
          <span className="font-bold">0</span>
          <User className="size-4 text-zinc-400" />
          <Badge variant="secondary" className="text-primary bg-accent">
            10% / 3%
          </Badge>
        </div>

        <div className="flex items-center gap-2 pl-4">
          <span className="text-sm text-zinc-400">Заработано:</span>
          <span className="font-bold">0</span>
          {/* Иконка TON: подставь свою */}
        </div>
      </CardContent>

      <CardFooter className="grid grid-cols-2 gap-2">
        <Button className="font-bold">Подробнее</Button>
        <Button variant="secondary">
          <Copy className="size-4" />
          Копировать ссылку
        </Button>
      </CardFooter>
    </Card>
  );
}
