export function apiFetch(path: string, init: RequestInit = {}) {
  const initData = window?.Telegram?.WebApp?.initData ?? "";
  return fetch(path, {
    ...init,
    headers: {
      ...init.headers,
      "x-telegram-init-data": initData,
    },
  });
}
