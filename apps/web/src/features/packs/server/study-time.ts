const APP_TIME_ZONE = "Asia/Colombo";
const APP_TIME_ZONE_OFFSET_MINUTES = 5 * 60 + 30;

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

export function getAppDayStartUtc(dateKey: string) {
  const [year, month, day] = dateKey.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day) - APP_TIME_ZONE_OFFSET_MINUTES * 60 * 1000);
}

export function getAppWeekStart(date: Date) {
  const todayKey = getAppDateKey(date);
  const appCalendarDay = new Date(`${todayKey}T00:00:00.000Z`);
  const day = appCalendarDay.getUTCDay();
  const mondayOffset = day === 0 ? -6 : 1 - day;
  return getAppDayStartUtc(addUtcDays(todayKey, mondayOffset));
}
