import { DateTime } from "luxon";
import type { TimeWindow } from "./panchang/types";

function ms(iso: string) {
  return DateTime.fromISO(iso, { zone: "utc" }).toMillis();
}

export function findCurrentOrNext<T extends TimeWindow>(
  windows: T[],
  nowMs: number
): { current: T | null; next: T | null } {
  let current: T | null = null;
  let next: T | null = null;
  for (const w of windows) {
    const start = ms(w.start);
    const end = ms(w.end);
    if (nowMs >= start && nowMs < end) {
      current = w;
    } else if (start > nowMs && (!next || start < ms(next.start))) {
      next = w;
    }
  }
  return { current, next };
}

export function isPast(w: TimeWindow, nowMs: number): boolean {
  return ms(w.end) <= nowMs;
}

interface Interval {
  start: number;
  end: number;
}

/** Merge overlapping/adjacent [start,end] ms intervals into a sorted, non-overlapping list. */
export function mergeIntervals(intervals: Interval[]): Interval[] {
  const sorted = [...intervals].sort((a, b) => a.start - b.start);
  const merged: Interval[] = [];
  for (const cur of sorted) {
    const last = merged[merged.length - 1];
    if (last && cur.start <= last.end) {
      last.end = Math.max(last.end, cur.end);
    } else {
      merged.push({ ...cur });
    }
  }
  return merged;
}

/** Gaps in `bounds` not covered by any of the `intervals` (intervals outside bounds are ignored/clamped). */
export function complementIntervals(intervals: Interval[], bounds: Interval): Interval[] {
  const clamp = (n: number) => Math.min(Math.max(n, bounds.start), bounds.end);
  const clamped = mergeIntervals(intervals)
    .map((iv) => ({ start: clamp(iv.start), end: clamp(iv.end) }))
    .filter((iv) => iv.end > iv.start);
  const gaps: Interval[] = [];
  let cursor = bounds.start;
  for (const iv of clamped) {
    if (iv.start > cursor) gaps.push({ start: cursor, end: iv.start });
    cursor = Math.max(cursor, iv.end);
  }
  if (cursor < bounds.end) gaps.push({ start: cursor, end: bounds.end });
  return gaps;
}

/** Clip a list of {start,end} (ms) segments to bounds, dropping any with no overlap. */
export function clipSegmentsToBounds<T extends { start: number; end: number }>(
  segments: T[],
  bounds: Interval
): T[] {
  return segments
    .map((s) => ({ ...s, start: Math.max(s.start, bounds.start), end: Math.min(s.end, bounds.end) }))
    .filter((s) => s.end > s.start);
}

/**
 * Remove `cutters` from each segment in `base`, splitting a segment into two
 * pieces if a cutter falls in its middle. Preserves each segment's other
 * fields (e.g. `label`) on both resulting pieces.
 * Mirrors drikpanchang's own rule: "if inauspicious time overlaps with
 * auspicious time, the inauspicious period is removed from the auspicious window."
 */
export function subtractIntervals<T extends { start: number; end: number }>(
  base: T[],
  cutters: Interval[]
): T[] {
  const mergedCutters = mergeIntervals(cutters);
  let result: T[] = [...base];
  for (const cutter of mergedCutters) {
    const next: T[] = [];
    for (const seg of result) {
      if (cutter.end <= seg.start || cutter.start >= seg.end) {
        next.push(seg);
        continue;
      }
      if (cutter.start > seg.start) next.push({ ...seg, start: seg.start, end: cutter.start });
      if (cutter.end < seg.end) next.push({ ...seg, start: cutter.end, end: seg.end });
    }
    result = next;
  }
  return result.filter((s) => s.end > s.start);
}
