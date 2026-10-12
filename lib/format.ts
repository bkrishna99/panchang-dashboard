import { DateTime } from "luxon";
import { LOCATIONS } from "./panchang/location";

export function toLocal(iso: string, timeZone: string = LOCATIONS.ireland.timeZone): DateTime {
  return DateTime.fromISO(iso, { zone: "utc" }).setZone(timeZone);
}

export function formatClock(iso: string, timeZone?: string): string {
  const dt = toLocal(iso, timeZone);
  return dt.toFormat("h:mm a");
}

export function formatClockWithDay(iso: string, referenceIso: string, timeZone?: string): string {
  const dt = toLocal(iso, timeZone);
  const ref = toLocal(referenceIso, timeZone);
  const time = dt.toFormat("h:mm a");
  if (dt.hasSame(ref, "day")) return time;
  return `${time}, ${dt.toFormat("EEE")}`;
}

export function formatRange(startIso: string, endIso: string, timeZone?: string): string {
  return `${formatClock(startIso, timeZone)} – ${formatClockWithDay(endIso, startIso, timeZone)}`;
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

export function fractionOfDay(iso: string, timeZone?: string): number {
  const dt = toLocal(iso, timeZone);
  return (dt.hour * 60 + dt.minute + dt.second / 60) / (24 * 60);
}
