import Image from "next/image";
import { cn } from "@/shared/lib/utils";

export function GameCard({ title, image, players, badge }: {
  title: string;
  image: string;   // /coinflip.avif
  players?: number;
  badge?: string;  // "1W GAMES"
}) {
  return (
    <article className="relative w-40 shrink-0 snap-start overflow-hidden rounded-2xl sm:w-48">
      {/* картинка на весь размер карточки */}
      <Image
        src={image}
        alt={title}
        width={400}
        height={500}
        className="aspect-[4/5] w-full object-cover"
        priority
      />

      {/* затемнение снизу, чтобы текст читался */}
      <div className="absolute inset-0 bg-linear-to-t from-black/70 via-transparent to-black/40" />

      {/* плашка-бейдж */}
      {badge && (
        <span className="absolute left-1/2 top-2 -translate-x-1/2 whitespace-nowrap rounded-full bg-black/60 px-2 py-0.5 text-[9px] font-bold tracking-widest text-white/90 backdrop-blur-sm">
          {badge}
        </span>
      )}

      {/* название */}
      <h3 className="absolute inset-x-2 bottom-7 text-center text-lg font-black uppercase italic leading-tight text-white drop-shadow">
        {title}
      </h3>

      {/* счётчик игроков */}
      {players !== undefined && (
        <p className="absolute bottom-2 left-1/2 flex -translate-x-1/2 items-center gap-1.5 text-[11px] font-medium text-white/90">
          <span className="size-1.5 animate-pulse rounded-full bg-emerald-400" />
          {players} playing
        </p>
      )}
    </article>
  );
}
