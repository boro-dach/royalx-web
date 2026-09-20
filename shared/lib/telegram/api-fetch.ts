export function apiFetch(path: string, init: RequestInit = {}) {
  const initData =
    window?.Telegram?.WebApp?.initData ||
    (process.env.NODE_ENV === "development" ? process.env.NEXT_PUBLIC_DEV_INIT_DATA : "") ||
    "";

  return fetch(path, {
    ...init,
    headers: {
      ...init.headers,
      "x-telegram-init-data": initData,
    },
  });
}
