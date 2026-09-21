export function getTelegramInitData(): string {
  if (typeof window === "undefined") return "";

  // 1. Primary: Telegram WebApp official SDK object
  const sdkInitData = window.Telegram?.WebApp?.initData;
  if (sdkInitData && sdkInitData.includes("hash=")) {
    try {
      sessionStorage.setItem("tg_init_data", sdkInitData);
    } catch {}
    return sdkInitData;
  }

  // 2. Check URL hash (#tgWebAppData=...) without destructive decoding
  try {
    const rawHash = window.location.hash;
    const match = rawHash.match(/[#&]tgWebAppData=([^&]+)/);
    if (match) {
      const decoded = decodeURIComponent(match[1]);
      if (decoded.includes("hash=")) {
        try {
          sessionStorage.setItem("tg_init_data", decoded);
        } catch {}
        return decoded;
      }
    }
  } catch {}

  // 3. Check URL search (?tgWebAppData=...)
  try {
    const rawSearch = window.location.search;
    const match = rawSearch.match(/[?&]tgWebAppData=([^&]+)/);
    if (match) {
      const decoded = decodeURIComponent(match[1]);
      if (decoded.includes("hash=")) {
        try {
          sessionStorage.setItem("tg_init_data", decoded);
        } catch {}
        return decoded;
      }
    }
  } catch {}

  // 4. Check cached initData in sessionStorage (only if valid)
  try {
    const cached = sessionStorage.getItem("tg_init_data");
    if (cached && cached.includes("hash=")) return cached;
  } catch {}

  // 5. Fallback for local development
  if (process.env.NODE_ENV === "development" && process.env.NEXT_PUBLIC_DEV_INIT_DATA) {
    return process.env.NEXT_PUBLIC_DEV_INIT_DATA;
  }

  return "";
}

export function apiFetch(path: string, init: RequestInit = {}) {
  const initData = getTelegramInitData();

  return fetch(path, {
    ...init,
    headers: {
      ...init.headers,
      "x-telegram-init-data": initData,
    },
  });
}

