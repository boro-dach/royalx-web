"use client";

import Link from "next/link";
import { useIsActiveRoute } from "@/widgets/footer/lib/use-is-active-route";
import type { NavItem } from "@/widgets/footer/lib/nav-items";
import { cn } from "@/shared/lib/utils";

export function NavLink({ href, icon: Icon }: NavItem) {
  const isActive = useIsActiveRoute(href);

  return (
    <Link href={href} className="flex items-center justify-center">
      <span
        className={cn(
          "flex h-12 w-16 items-center justify-center rounded-full transition-all",
          isActive
            ? "bg-white/15 text-white"
            : "text-white/40 hover:text-white/70 active:bg-white/5",
        )}
      >
        <Icon className="size-6" strokeWidth={2} />
      </span>
    </Link>
  );
}
