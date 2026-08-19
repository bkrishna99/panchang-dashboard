"use client";

import { useState } from "react";
import { DateTime } from "luxon";
import type { PanchangData } from "@/lib/panchang/types";
import { clipSegmentsToBounds, complementIntervals, subtractIntervals } from "@/lib/schedule";
import { formatClockWithDay } from "@/lib/format";

function ms(iso: string) {
  return DateTime.fromISO(iso, { zone: "utc" }).toMillis();
}

interface Segment {
  label: string;
  start: number;
  end: number;
}

// Short "why" explanations shown in the legend and the now-marker tooltip.
const WHY: Record<string, string> = {
  "Venus Hora": "ruled by Venus — good for love, art & beneficial dealings",
  "Jupiter Hora": "ruled by Jupiter — good for travel, money & spiritual work",
  "Amrit Kalam": "the \u201cnectar\u201d window — highly auspicious for any start",
  "Abhijit Muhurta": "victory window centered on solar noon — universally auspicious",
  "Rahu Kalam": "ruled by Rahu — avoid starting anything important",
  "Yamaganda": "ruled by Yama — avoid starting anything important",
  "Gulika Kalam": "ruled by Gulika/Mandi — avoid starting anything important",
  "Dur Muhurtam": "an inherently inauspicious muhurta of the day",
  "Varjyam": "nakshatra-based inauspicious window — avoid",
};

const WIDTH = 900;
const ROW_HEIGHT = 26;
const ROW_GAP = 8;
const AXIS_TOP = 20;
const CHART_TOP = AXIS_TOP + 14;

/** Merge same-label segments into one row with all its time ranges. */
function groupByLabel(segments: Segment[]) {
  const map = new Map<string, { start: number; end: number }[]>();
  for (const s of segments) {
    const arr = map.get(s.label) ?? [];
    arr.push({ start: s.start, end: s.end });
    map.set(s.label, arr);
  }
  return Array.from(map.entries()).map(([label, ranges]) => ({
    label,
    ranges: ranges.sort((a, b) => a.start - b.start),
  }));
}

export function GanttChart({ data, nowMs }: { data: PanchangData; nowMs: number }) {
  const [showNowTip, setShowNowTip] = useState(false);

  const sunriseMs = ms(data.sunrise);
  const sunsetMs = ms(data.sunset);
  const nextSunriseMs = ms(data.nextSunrise);
  const totalMs = nextSunriseMs - sunriseMs;

  const xOf = (t: number) => {
    const frac = Math.min(1, Math.max(0, (t - sunriseMs) / totalMs));
    return frac * WIDTH;
  };

  const bounds = { start: sunriseMs, end: nextSunriseMs };

  const goodSegments: Segment[] = clipSegmentsToBounds(
    [
      ...data.hora
        .filter((h) => h.planet === "Venus")
        .map((h) => ({ label: "Venus Hora", start: ms(h.start), end: ms(h.end) })),
      ...data.hora
        .filter((h) => h.planet === "Jupiter")
        .map((h) => ({ label: "Jupiter Hora", start: ms(h.start), end: ms(h.end) })),
      ...data.amritKalam.map((w) => ({ label: "Amrit Kalam", start: ms(w.start), end: ms(w.end) })),
      ...(data.abhijitMuhurta
        ? [{ label: "Abhijit Muhurta", start: ms(data.abhijitMuhurta.start), end: ms(data.abhijitMuhurta.end) }]
        : []),
    ],
    bounds
  );

  const badSegments: Segment[] = clipSegmentsToBounds(
    [
      { label: "Rahu Kalam", start: ms(data.rahuKalam.start), end: ms(data.rahuKalam.end) },
      { label: "Yamaganda", start: ms(data.yamaganda.start), end: ms(data.yamaganda.end) },
      { label: "Gulika Kalam", start: ms(data.gulikaKalam.start), end: ms(data.gulikaKalam.end) },
      ...data.durMuhurtam.map((w) => ({ label: "Dur Muhurtam", start: ms(w.start), end: ms(w.end) })),
      ...data.varjyam.map((w) => ({ label: "Varjyam", start: ms(w.start), end: ms(w.end) })),
    ],
    bounds
  );

  const neutralIntervals = complementIntervals(
    [...goodSegments, ...badSegments].map((s) => ({ start: s.start, end: s.end })),
    bounds
  );
  const neutralSegments: Segment[] = neutralIntervals
    .filter((iv) => iv.end - iv.start > 60_000)
    .map((iv) => ({ label: "Neutral", start: iv.start, end: iv.end }));

  // Drikpanchang's own rule: "if inauspicious time overlaps with auspicious
  // time, the inauspicious period is removed from the auspicious window."
  const goodDisplay = subtractIntervals(
    goodSegments,
    badSegments.map((s) => ({ start: s.start, end: s.end }))
  ).filter((s) => s.end - s.start > 60_000);

  const rows: { label: string; color: string; segments: Segment[] }[] = [
    { label: "Good", color: "var(--gold)", segments: goodDisplay },
    { label: "Neutral", color: "var(--muted-2)", segments: neutralSegments },
    { label: "Bad", color: "var(--rust)", segments: badSegments },
  ];

  const chartHeight = rows.length * ROW_HEIGHT + (rows.length - 1) * ROW_GAP;
  const sunsetX = xOf(sunsetMs);
  const nowX = xOf(nowMs);
  const nowVisible = nowMs >= sunriseMs && nowMs <= nextSunriseMs;

  // Work out why "now" is what it is: bad takes precedence, then good, then neutral.
  const badHit = badSegments.find((s) => nowMs >= s.start && nowMs < s.end);
  const goodHit = !badHit ? goodDisplay.find((s) => nowMs >= s.start && nowMs < s.end) : undefined;
  const neutralHit = !badHit && !goodHit ? neutralSegments.find((s) => nowMs >= s.start && nowMs < s.end) : undefined;
  const nowCategory: "bad" | "good" | "neutral" = badHit ? "bad" : goodHit ? "good" : "neutral";
  const nowSeg = badHit ?? goodHit ?? neutralHit;
  const nowCategoryColor = nowCategory === "bad" ? "var(--rust)" : nowCategory === "good" ? "var(--gold)" : "var(--muted-2)";
  const nowWhy =
    nowCategory === "neutral"
      ? "no active good or bad window right now"
      : WHY[nowSeg?.label ?? ""] ?? "";

  // Tooltip box geometry, clamped so it never runs off either edge.
  const TIP_W = 260;
  const TIP_H = 58;
  const tipX = Math.min(Math.max(nowX - TIP_W / 2, 4), WIDTH - TIP_W - 4);
  const tipY = AXIS_TOP - 14 - TIP_H;

  return (
    <div
      className="w-full max-w-2xl mx-auto rounded-2xl border p-5"
      style={{ background: "var(--card)", borderColor: "var(--card-border)" }}
    >
      <p className="text-[10px] uppercase tracking-[0.16em] mb-3" style={{ color: "var(--muted)" }}>
        Today at a glance
      </p>

      <svg
        viewBox={`0 0 ${WIDTH} ${CHART_TOP + chartHeight + 8}`}
        className="w-full h-auto overflow-visible"
        role="img"
        aria-label="Good, bad and neutral time windows for the day"
      >
        {/* sunset divider */}
        <line
          x1={sunsetX}
          x2={sunsetX}
          y1={AXIS_TOP - 6}
          y2={CHART_TOP + chartHeight}
          stroke="var(--card-border)"
          strokeDasharray="3 3"
        />

        {rows.map((row, ri) => {
          const y = CHART_TOP + ri * (ROW_HEIGHT + ROW_GAP);
          return (
            <g key={row.label}>
              <rect x={0} y={y} width={WIDTH} height={ROW_HEIGHT} rx={6} fill="rgba(144,150,184,0.08)" />
              {row.segments.map((seg, si) => {
                const x1 = xOf(seg.start);
                const x2 = xOf(seg.end);
                return (
                  <rect
                    key={si}
                    x={x1}
                    y={y}
                    width={Math.max(2, x2 - x1)}
                    height={ROW_HEIGHT}
                    rx={4}
                    fill={row.color}
                    opacity={row.label === "Neutral" ? 0.35 : 0.85}
                  >
                    <title>
                      {seg.label}: {formatClockWithDay(new Date(seg.start).toISOString(), data.sunrise)} –{" "}
                      {formatClockWithDay(new Date(seg.end).toISOString(), data.sunrise)}
                    </title>
                  </rect>
                );
              })}
              <text
                x={8}
                y={y + ROW_HEIGHT / 2 + 4}
                fontSize={11}
                fontFamily="var(--font-body)"
                fill={ri === 2 ? "#1c1032" : "var(--ink)"}
                opacity={0.85}
              >
                {row.label}
              </text>
            </g>
          );
        })}

        {nowVisible && (
          <g
            onMouseEnter={() => setShowNowTip(true)}
            onMouseLeave={() => setShowNowTip(false)}
            onClick={() => setShowNowTip((v) => !v)}
            style={{ cursor: "pointer" }}
          >
            {/* generous invisible hit area, easier to hover/tap than the thin line */}
            <rect x={nowX - 10} y={0} width={20} height={CHART_TOP + chartHeight} fill="transparent" />
            <line
              x1={nowX}
              x2={nowX}
              y1={AXIS_TOP - 6}
              y2={CHART_TOP + chartHeight}
              stroke="var(--parchment)"
              strokeWidth={1.5}
            />
            <circle className={showNowTip ? undefined : "pulse-marker"} cx={nowX} cy={AXIS_TOP - 6} r={4} fill="var(--parchment)" />

            {showNowTip && (
              <g>
                <rect
                  x={tipX}
                  y={tipY}
                  width={TIP_W}
                  height={TIP_H}
                  rx={8}
                  fill="var(--ink-2)"
                  stroke="var(--card-border)"
                />
                <line x1={nowX} x2={nowX} y1={tipY + TIP_H} y2={AXIS_TOP - 6} stroke="var(--card-border)" strokeDasharray="2 2" />
                <text x={tipX + 12} y={tipY + 18} fontSize={11} fontFamily="var(--font-data)" fill="var(--parchment)">
                  {formatClockWithDay(new Date(nowMs).toISOString(), data.sunrise)}
                  <tspan fill={nowCategoryColor}>
                    {"  \u25CF  "}
                    {nowCategory === "bad" ? "Bad" : nowCategory === "good" ? "Good" : "Neutral"}
                    {nowSeg?.label && nowCategory !== "neutral" ? ` \u2014 ${nowSeg.label}` : ""}
                  </tspan>
                </text>
                <text x={tipX + 12} y={tipY + 34} fontSize={10} fontFamily="var(--font-body)" fill="var(--muted)">
                  <tspan x={tipX + 12} dy="0">
                    {nowWhy}
                  </tspan>
                  {nowSeg && (
                    <tspan x={tipX + 12} dy="14">
                      until {formatClockWithDay(new Date(nowSeg.end).toISOString(), data.sunrise)}
                    </tspan>
                  )}
                </text>
              </g>
            )}
          </g>
        )}
      </svg>

      <div className="flex justify-between mt-1 text-[10px]" style={{ fontFamily: "var(--font-data)", color: "var(--muted)" }}>
        <span>{formatClockWithDay(data.sunrise, data.sunrise)} rise</span>
        <span>{formatClockWithDay(data.sunset, data.sunrise)} set</span>
        <span>{formatClockWithDay(data.nextSunrise, data.sunrise)} rise</span>
      </div>

      <LegendSection
        title="Good"
        subtitle="Auspicious \u2014 favorable for starting things"
        color="var(--gold)"
        groups={groupByLabel(goodDisplay)}
        refIso={data.sunrise}
      />
      <LegendSection
        title="Bad"
        subtitle="Inauspicious \u2014 best avoided for new beginnings"
        color="var(--rust)"
        groups={groupByLabel(badSegments)}
        refIso={data.sunrise}
      />

      <p className="text-[10px] mt-3" style={{ color: "var(--muted-2)" }}>
        Where a bad window overlaps a good one, the bad window takes
        precedence (per drikpanchang&apos;s own convention) — so a good
        window may appear split around it. Hover (or tap) the marker on the
        chart to see why the current moment is good, bad or neutral.
      </p>
    </div>
  );
}

function LegendSection({
  title,
  subtitle,
  color,
  groups,
  refIso,
}: {
  title: string;
  subtitle: string;
  color: string;
  groups: { label: string; ranges: { start: number; end: number }[] }[];
  refIso: string;
}) {
  if (groups.length === 0) return null;
  return (
    <div className="mt-4">
      <div className="flex items-baseline gap-2 mb-1.5">
        <span className="inline-block w-2 h-2 rounded-full" style={{ background: color }} />
        <p className="text-xs font-medium" style={{ color: "var(--parchment)" }}>
          {title}
        </p>
        <p className="text-[10px]" style={{ color: "var(--muted-2)" }}>
          {subtitle}
        </p>
      </div>
      <ul className="flex flex-col gap-1">
        {groups.map((g) => (
          <li key={g.label} className="flex flex-col sm:flex-row sm:items-baseline gap-x-2 text-[11px]">
            <span className="flex items-baseline gap-1.5 shrink-0" style={{ color: "var(--parchment)" }}>
              <span className="font-medium">{g.label}</span>
              <span style={{ fontFamily: "var(--font-data)", color: "var(--muted)" }}>
                {g.ranges
                  .map(
                    (r) =>
                      `${formatClockWithDay(new Date(r.start).toISOString(), refIso)}\u2013${formatClockWithDay(
                        new Date(r.end).toISOString(),
                        refIso
                      )}`
                  )
                  .join(", ")}
              </span>
            </span>
            <span style={{ color: "var(--muted-2)" }}>{WHY[g.label]}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
