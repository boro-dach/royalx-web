import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/shared/ui/carousel";
import { GameCard } from "@/widgets/games/ui/game-card";
import Header from "@/widgets/header/ui/header";
import { Flame } from "lucide-react";

const GAMES = Array.from({ length: 8 }).map((_, i) => ({
  id: i,
  image: "/coinflip.avif",
  title: "Coin Flip",
  badge: "1W GAMES",
  players: 12,
}));

export default function Home() {
  return (
    <div className="flex w-full flex-col gap-6 px-4">
      <Header />

      <div className="flex h-24 w-full items-center justify-center rounded-2xl bg-green-500">
        <p>здесь будет баннер/ы</p>
      </div>

      <Carousel opts={{ align: "start", dragFree: true }} className="w-full">
        {/* шапка секции: заголовок слева, стрелки справа */}
        <div className="flex items-center justify-between">
          <p className="flex items-center gap-1.5 font-bold">
            <Flame className="size-5 text-orange-500" />
            Популярное
          </p>

          <div className="flex gap-2">
            <CarouselPrevious className="static h-8 w-8 translate-y-0 rounded-full border-white/10 bg-black/70 text-white backdrop-blur hover:bg-black/90 hover:text-white" />
            <CarouselNext className="static h-8 w-8 translate-y-0 rounded-full border-white/10 bg-black/70 text-white backdrop-blur hover:bg-black/90 hover:text-white" />
          </div>
        </div>

        <CarouselContent className="-ml-3 mt-3">
          {GAMES.map(g => (
            <CarouselItem key={g.id} className="basis-auto pl-3">
              <GameCard {...g} />
            </CarouselItem>
          ))}
        </CarouselContent>
      </Carousel>
    </div>
  );
}
