import { parseMadridDateTime } from "../../../utils/madridTime";
import { addSchedulerDateKeyDays } from "../../../utils/schedulerDateTime";

export const patientCountry = (value?: string | null): string =>
  value &&
  ["spain", "es", "españa", "espana"].includes(value.trim().toLowerCase())
    ? "España"
    : value || "";

export function civilDate(value: string): Date {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day, 12);
}
export const civilDateKey = (value: Date): string =>
  `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}-${String(value.getDate()).padStart(2, "0")}`;
export const civilDateLabel = (value: string) =>
  new Intl.DateTimeFormat("es-ES", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(civilDate(value));

export function patientPeriodBounds(
  from: string,
  to: string,
): { from?: string; to?: string } {
  const start = from ? parseMadridDateTime(from, "00:00")?.iso : undefined;
  const nextKey = to ? addSchedulerDateKeyDays(to, 1) : null;
  const nextDay = nextKey
    ? parseMadridDateTime(nextKey, "00:00")?.iso
    : undefined;
  return {
    from: start,
    to: nextDay
      ? new Date(new Date(nextDay).getTime() - 1).toISOString()
      : undefined,
  };
}
