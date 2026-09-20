"use client";

import { usePathname } from "next/navigation";

export function useIsActiveRoute(href: string): boolean {
  const pathname = usePathname();

  if (href === "/") {
    return pathname === "/"; // главная — только точное совпадение, иначе будет активна всегда
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}
