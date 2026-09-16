import { DebugPanel } from "@/widgets/debug/ui/debug-panel";
import Header from "@/widgets/header/ui/header";
import Image from "next/image";

export default function Home() {
  return (
    <div className="flex flex-col w-full gap-6 px-2">
      <Header />
      <DebugPanel />
    </div>
  );
}
