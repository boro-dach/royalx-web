import { Gamepad2, Home, User, type LucideIcon } from "lucide-react";

export type NavItem = {
  href: string;
  icon: LucideIcon;
};

export const NAV_ITEMS: NavItem[] = [
  { href: "/games", icon: Gamepad2},
  { href: "/", icon: Home},
  { href: "/me", icon: User }
];
