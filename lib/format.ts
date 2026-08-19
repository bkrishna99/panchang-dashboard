import { DateTime } from "luxon";
import { LOCATION } from "./panchang/location";

export function toLocal(iso: string): DateTime {
  return DateTime.fromISO(iso, { zone: "utc" }).setZone(LOCATION.timeZone);
}

export function formatClock(iso: string): string {
  const dt = toLocal(iso);
  return dt.toFormat("h:mm a");
}

export function formatClockWithDay(iso: string, referenceIso: string): string {
  const dt = toLocal(iso);
  const ref = toLocal(referenceIso);
  const time = dt.toFormat("h:mm a");
  if (dt.hasSame(ref, "day")) return time;
  return `${time}, ${dt.toFormat("EEE")}`;
}

export function formatRange(startIso: string, endIso: string): string {
  return `${formatClock(startIso)} – ${formatClockWithDay(endIso, startIso)}`;
}

export function isNowWithin(nowMs: number, startIso: string, endIso: string): boolean {
  const start = DateTime.fromISO(startIso, { zone: "utc" }).toMillis();
  const end = DateTime.fromISO(endIso, { zone: "utc" }).toMillis();
  return nowMs >= start && nowMs < end;
}

export function minutesUntil(nowMs: number, iso: string): number {
  const t = DateTime.fromISO(iso, { zone: "utc" }).toMillis();
  return Math.round((t - nowMs) / 60000);
}

export function fractionOfDay(iso: string): number {
  const dt = toLocal(iso);
  return (dt.hour * 60 + dt.minute + dt.second / 60) / (24 * 60);
}
