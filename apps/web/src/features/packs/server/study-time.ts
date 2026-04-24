const APP_TIME_ZONE = "Asia/Colombo";

export function getAppDateKey(date: Date) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: APP_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

export function addUtcDays(dateKey: string, days: number) {
  const [year, month, day] = dateKey.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day + days));
  return date.toISOString().slice(0, 10);
}

export function getAppWeekStart(date: Date) {
  const todayKey = getAppDateKey(date);
  const today = new Date(`${todayKey}T00:00:00.000Z`);
  const day = today.getUTCDay();
  const mondayOffset = day === 0 ? -6 : 1 - day;
  return new Date(today.getTime() + mondayOffset * 24 * 60 * 60 * 1000);
}
