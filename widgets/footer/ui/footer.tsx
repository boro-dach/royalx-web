"use client"

import { NavLink } from "@/widgets/footer/ui/nav-link";
import { NAV_ITEMS } from "@/widgets/footer/lib/nav-items";

export default function Footer() {
  return (
    <footer className="sticky bottom-4 mx-4 mt-auto flex flex-row items-center justify-center gap-2 rounded-full border border-white/10 bg-black/80 px-2 backdrop-blur-md" >
      {NAV_ITEMS.map((item) => (
        <NavLink key={item.href} {...item} />
      ))}
    </footer>
  );
}
