"use client";

import { useEffect, useState } from "react";
import { useProfile } from "@/entities/profile/model/use-profile";

export function DebugPanel() {
  const { data: profile, isLoading, error } = useProfile();
  const [initData, setInitData] = useState<string | null>(null);

  useEffect(() => {
    setInitData(window?.Telegram?.WebApp?.initData ?? null);
  }, []);

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-black/90 text-green-400 text-xs font-mono p-3 max-h-[40vh] overflow-y-auto border-t border-green-800">
      <p className="text-white mb-1">DEBUG</p>
      <p>
        initData:{" "}
        {initData
          ? `${initData.slice(0, 60)}... (${initData.length} chars)`
          : "null/empty"}
      </p>
      <p>isLoading: {String(isLoading)}</p>
      <p>error: {error ? error.message : "none"}</p>
      <p>profile: {profile ? JSON.stringify(profile) : "undefined"}</p>
    </div>
  );
}
