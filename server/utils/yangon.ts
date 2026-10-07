const YANGON_OFFSET_MS = (6 * 60 + 30) * 60 * 1000;

export function yangonDay(date = new Date()) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Yangon',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

export function yangonDayStart(day: string) {
  const [year, month, date] = day.split('-').map(Number);
  return new Date(Date.UTC(year!, month! - 1, date!, 0, 0, 0) - YANGON_OFFSET_MS);
}

export function addYangonDays(day: string, amount: number) {
  return yangonDay(new Date(yangonDayStart(day).getTime() + amount * 86_400_000));
}

export function addYangonMonths(monthStart: string, amount: number) {
  const [year, month] = monthStart.split('-').map(Number);
  const shifted = new Date(Date.UTC(year!, month! - 1 + amount, 1));
  const nextYear = shifted.getUTCFullYear();
  const nextMonth = String(shifted.getUTCMonth() + 1).padStart(2, '0');
  return `${nextYear}-${nextMonth}-01`;
}

export function yangonRange(startDay: string, endDay: string) {
  return {
    start: yangonDayStart(startDay),
    end: yangonDayStart(endDay),
  };
}
