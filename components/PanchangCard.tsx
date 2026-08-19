import { DateTime } from "luxon";
import type { PanchangData, TimeWindow } from "@/lib/panchang/types";
import { findCurrentOrNext } from "@/lib/schedule";
import { formatClock, formatClockWithDay, isNowWithin, minutesUntil } from "@/lib/format";

function joinRanges(windows: TimeWindow[], refIso: string): string {
  return windows
    .map((w) => `${formatClockWithDay(w.start, refIso)}–${formatClockWithDay(w.end, refIso)}`)
    .join(", ");
}

export function PanchangCard({ data, nowMs }: { data: PanchangData; nowMs: number }) {
  const venus = findCurrentOrNext(
    data.hora.filter((h) => h.planet === "Venus"),
    nowMs
  );
  const jupiter = findCurrentOrNext(
    data.hora.filter((h) => h.planet === "Jupiter"),
    nowMs
  );

  const muhurtaRows: { label: string; windows: TimeWindow[]; good?: boolean }[] = [
    { label: "Rahu Kalam", windows: [data.rahuKalam] },
    { label: "Yamaganda", windows: [data.yamaganda] },
    { label: "Gulika Kalam", windows: [data.gulikaKalam] },
    { label: "Dur Muhurtam", windows: data.durMuhurtam },
    { label: "Varjyam", windows: data.varjyam },
    { label: "Amrit Kalam", windows: data.amritKalam, good: true },
  ];

  return (
    <div
      className="w-full max-w-sm mx-auto rounded-2xl border p-5 flex flex-col gap-3.5"
      style={{ background: "var(--card)", borderColor: "var(--card-border)" }}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-[10px] uppercase tracking-[0.16em]" style={{ color: "var(--muted)" }}>
            {data.location}
          </p>
          <h1 className="text-lg leading-tight" style={{ fontFamily: "var(--font-display)", color: "var(--parchment)" }}>
            {data.weekday}
            <span style={{ color: "var(--muted)" }}>, </span>
            <span style={{ fontStyle: "italic", color: "var(--gold-soft)" }}>
              {DateTime.fromISO(data.date).toFormat("d LLL")}
            </span>
          </h1>
        </div>
        <p className="text-[10px] text-right leading-tight" style={{ fontFamily: "var(--font-data)", color: "var(--muted-2)" }}>
          ☉ {formatClock(data.sunrise)}
          <br />
          ☾ {formatClock(data.sunset)}
        </p>
      </div>

      {/* Special day badge */}
      {data.specialDays.length > 0 && (
        <div
          className="rounded-lg px-3 py-1.5 text-xs font-medium"
          style={{ background: "rgba(203,161,53,0.14)", color: "var(--gold-soft)" }}
        >
          {data.specialDays.map((d) => d.title).join(" · ")}
        </div>
      )}

      {/* Tithi / Nakshatra */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <p className="text-[10px] uppercase tracking-wide mb-0.5" style={{ color: "var(--muted)" }}>
            Tithi
          </p>
          <p className="text-sm leading-tight" style={{ color: "var(--parchment)" }}>
            {data.tithi.name}
          </p>
          <p className="text-[11px]" style={{ fontFamily: "var(--font-data)", color: "var(--muted-2)" }}>
            till {formatClockWithDay(data.tithi.end, data.sunrise)}
          </p>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-wide mb-0.5" style={{ color: "var(--muted)" }}>
            Nakshatra
          </p>
          <p className="text-sm leading-tight" style={{ color: "var(--parchment)" }}>
            {data.nakshatras[0]?.name}
          </p>
          <p className="text-[11px]" style={{ fontFamily: "var(--font-data)", color: "var(--muted-2)" }}>
            till {formatClockWithDay(data.nakshatras[0]?.end, data.sunrise)}
          </p>
        </div>
      </div>

      <div style={{ borderTop: "1px solid var(--card-border)" }} />

      {/* Hora */}
      <div className="flex flex-col gap-1.5">
        <p className="text-[10px] uppercase tracking-wide" style={{ color: "var(--gold-soft)" }}>
          Good time · Hora
        </p>
        <HoraLine label="Venus" nowMs={nowMs} current={venus.current} next={venus.next} refIso={data.sunrise} />
        <HoraLine label="Jupiter" nowMs={nowMs} current={jupiter.current} next={jupiter.next} refIso={data.sunrise} />
      </div>

      <div style={{ borderTop: "1px solid var(--card-border)" }} />

      {/* Muhurtas */}
      <div className="flex flex-col gap-1">
        <p className="text-[10px] uppercase tracking-wide mb-0.5" style={{ color: "var(--muted)" }}>
          Avoid / favorable windows
        </p>
        <div className="grid grid-cols-1 gap-1">
          {muhurtaRows.map((row) => {
            const active = row.windows.some((w) => isNowWithin(nowMs, w.start, w.end));
            return (
              <div key={row.label} className="flex items-baseline justify-between gap-2 text-xs">
                <span
                  className="flex items-center gap-1.5"
                  style={{ color: row.good ? "var(--gold-soft)" : "var(--parchment)" }}
                >
                  {active && (
                    <span
                      className="w-1.5 h-1.5 rounded-full pulse-marker"
                      style={{ background: row.good ? "var(--gold)" : "var(--rust)" }}
                    />
                  )}
                  {row.label}
                </span>
                <span style={{ fontFamily: "var(--font-data)", color: "var(--muted)" }}>
                  {joinRanges(row.windows, data.sunrise)}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      <p className="text-[10px] pt-0.5" style={{ color: "var(--muted-2)" }}>
        Computed astronomically for Dublin · updated{" "}
        {DateTime.fromISO(data.generatedAt).toFormat("h:mm a")}
      </p>
    </div>
  );
}

function HoraLine({
  label,
  nowMs,
  current,
  next,
  refIso,
}: {
  label: string;
  nowMs: number;
  current: (TimeWindow & { planet: string }) | null;
  next: (TimeWindow & { planet: string }) | null;
  refIso: string;
}) {
  const w = current ?? next;
  return (
    <div className="flex items-baseline justify-between gap-2 text-xs">
      <span className="flex items-center gap-1.5" style={{ color: "var(--parchment)" }}>
        <span className="w-1.5 h-1.5 rounded-full" style={{ background: current ? "var(--gold)" : "var(--muted-2)" }} />
        {label}
        {current && (
          <span
            className="text-[9px] px-1 py-px rounded uppercase tracking-wide"
            style={{ background: "var(--gold)", color: "var(--ink)" }}
          >
            now
          </span>
        )}
      </span>
      {w ? (
        <span style={{ fontFamily: "var(--font-data)", color: "var(--muted)" }}>
          {!current && `in ${minutesUntil(nowMs, w.start)}m · `}
          {formatClockWithDay(w.start, refIso)}–{formatClockWithDay(w.end, refIso)}
        </span>
      ) : (
        <span style={{ color: "var(--muted-2)" }}>—</span>
      )}
    </div>
  );
}
