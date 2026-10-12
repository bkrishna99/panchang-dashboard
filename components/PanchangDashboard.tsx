"use client";

import { useEffect, useState } from "react";
import type { PanchangData } from "@/lib/panchang/types";
import { LOCATIONS, type LocationId } from "@/lib/panchang/location";
import { PanchangCard } from "@/components/PanchangCard";
import { GanttChart } from "@/components/GanttChart";

export function PanchangDashboard({ initialDate }: { initialDate: string }) {
  const [data, setData] = useState<PanchangData | null>(null);
  const [error, setError] = useState<{ key: string; message: string } | null>(null);
  const [locationId, setLocationId] = useState<LocationId>("ireland");
  const [selectedDate, setSelectedDate] = useState(initialDate);
  const [nowMs, setNowMs] = useState<number>(() => Date.now());
  const location = LOCATIONS[locationId];
  const queryKey = `${selectedDate}:${locationId}`;
  const currentError = error?.key === queryKey ? error.message : null;
  const currentData = data?.date === selectedDate && data.location === location.name ? data : null;
  const loading = !currentData && !currentError;

  useEffect(() => {
    const controller = new AbortController();
    fetch(`/api/panchang?date=${selectedDate}&location=${locationId}`, { signal: controller.signal })
      .then((res) => {
        if (!res.ok) throw new Error(`API returned ${res.status}`);
        return res.json();
      })
      .then((d) => {
        if (!controller.signal.aborted) setData(d);
      })
      .catch((e) => {
        if (!controller.signal.aborted) setError({ key: queryKey, message: String(e) });
      });
    return () => {
      controller.abort();
    };
  }, [selectedDate, locationId, queryKey]);

  useEffect(() => {
    const id = setInterval(() => setNowMs(Date.now()), 30_000);
    return () => clearInterval(id);
  }, []);

  return (
    <main className="min-h-screen flex items-center justify-center p-4">
      <div className="starfield" style={{ position: "fixed", inset: 0, pointerEvents: "none", opacity: 0.4 }} />
      <div className="relative w-full flex flex-col items-center gap-4">
        <section
          className="w-full max-w-2xl rounded-2xl border p-4 sm:px-5"
          style={{ background: "var(--card)", borderColor: "var(--card-border)" }}
          aria-label="Panchang date and location"
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label className="flex flex-col gap-1 text-[10px] uppercase tracking-[0.12em]" style={{ color: "var(--muted)" }}>
              Date
              <input
                type="date"
                value={selectedDate}
                onChange={(event) => setSelectedDate(event.target.value)}
                className="rounded-lg border px-3 py-2 text-sm normal-case tracking-normal outline-none focus:border-[var(--gold)]"
                style={{ colorScheme: "dark", color: "var(--parchment)", background: "var(--ink-2)", borderColor: "var(--card-border)" }}
              />
            </label>
            <label className="flex flex-col gap-1 text-[10px] uppercase tracking-[0.12em]" style={{ color: "var(--muted)" }}>
              Location &amp; timezone
              <select
                value={locationId}
                onChange={(event) => setLocationId(event.target.value as LocationId)}
                className="rounded-lg border px-3 py-2 text-sm normal-case tracking-normal outline-none focus:border-[var(--gold)]"
                style={{ color: "var(--parchment)", background: "var(--ink-2)", borderColor: "var(--card-border)" }}
              >
                <option value="ireland">Ireland · Dublin (Europe/Dublin)</option>
                <option value="india">India · New Delhi (Asia/Kolkata)</option>
              </select>
            </label>
          </div>
          <p className="mt-2 text-[10px]" style={{ color: "var(--muted-2)" }} aria-live="polite">
            {loading ? "Updating Panchang…" : `Times shown in ${location.timeZone}`}
          </p>
        </section>
        {currentError && (
          <p className="text-sm" style={{ color: "var(--rust-soft)" }}>
            Couldn&apos;t load Panchang data: {currentError}
          </p>
        )}
        {loading && (
          <p className="text-sm" style={{ color: "var(--muted)" }}>
            Loading Panchang…
          </p>
        )}
        {currentData && (
          <>
            <PanchangCard data={currentData} nowMs={nowMs} />
            <GanttChart data={currentData} nowMs={nowMs} />
          </>
        )}
      </div>
    </main>
  );
}
