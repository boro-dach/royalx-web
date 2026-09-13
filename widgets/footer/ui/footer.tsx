import { Button } from "@/shared/ui/button";
import MeDrawer from "@/widgets/me/ui/me-drawer";
import { Home } from "lucide-react";
import Link from "next/link";

export default function Footer() {
  return (
    <footer className="h-12 mt-auto flex flex-row self-center items-center justify-center w-fit rounded-2xl sticky bottom-4 px-4 border gap-2">
      <Link href={"/"}>
        <Button variant={"ghost"} size={"icon-lg"}>
          <Home className="size-6" />
        </Button>
      </Link>
      <MeDrawer />
    </footer>
  );
}
