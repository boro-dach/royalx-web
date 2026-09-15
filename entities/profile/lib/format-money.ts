export function splitMoney(cents: number) {
  const abs = Math.abs(cents);
  return {
    whole: Math.floor(abs / 100),
    fraction: String(abs % 100).padStart(2, "0"),
  };
}
