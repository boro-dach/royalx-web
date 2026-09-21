export function getTelegramInitData(): string {
  if (typeof window === "undefined") return "";

  // 1. Check Telegram WebApp object
  const sdkInitData = window.Telegram?.WebApp?.initData;
  if (sdkInitData) {
    try {
      sessionStorage.setItem("tg_init_data", sdkInitData);
    } catch {}
    return sdkInitData;
  }

  // 2. Check URL hash (#tgWebAppData=...)
  try {
    const hash = window.location.hash.startsWith("#")
      ? window.location.hash.slice(1)
      : window.location.hash;
    const hashParams = new URLSearchParams(hash);
    const fromHash = hashParams.get("tgWebAppData");
    if (fromHash) {
      sessionStorage.setItem("tg_init_data", fromHash);
      return fromHash;
    }
  } catch {}

  // 3. Check URL search (?tgWebAppData=...)
  try {
    const searchParams = new URLSearchParams(window.location.search);
    const fromSearch = searchParams.get("tgWebAppData");
    if (fromSearch) {
      sessionStorage.setItem("tg_init_data", fromSearch);
      return fromSearch;
    }
  } catch {}

  // 4. Check cached initData in sessionStorage
  try {
    const cached = sessionStorage.getItem("tg_init_data");
    if (cached) return cached;
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

