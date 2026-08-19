"use client";

import { useEffect, useState } from "react";
import type { PanchangData } from "@/lib/panchang/types";
import { PanchangCard } from "@/components/PanchangCard";
import { GanttChart } from "@/components/GanttChart";

export default function Home() {
  const [data, setData] = useState<PanchangData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [nowMs, setNowMs] = useState<number>(() => Date.now());

  useEffect(() => {
    let cancelled = false;
    fetch("/api/panchang")
      .then((res) => {
        if (!res.ok) throw new Error(`API returned ${res.status}`);
        return res.json();
      })
      .then((d) => {
        if (!cancelled) setData(d);
      })
      .catch((e) => {
        if (!cancelled) setError(String(e));
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const id = setInterval(() => setNowMs(Date.now()), 30_000);
    return () => clearInterval(id);
  }, []);

  return (
    <main className="min-h-screen flex items-center justify-center p-4">
      <div className="starfield" style={{ position: "fixed", inset: 0, pointerEvents: "none", opacity: 0.4 }} />
      <div className="relative w-full flex flex-col items-center gap-4">
        {error && (
          <p className="text-sm" style={{ color: "var(--rust-soft)" }}>
            Couldn&apos;t load Panchang data: {error}
          </p>
        )}
        {!data && !error && (
          <p className="text-sm" style={{ color: "var(--muted)" }}>
            Loading today&apos;s Panchang…
          </p>
        )}
        {data && (
          <>
            <PanchangCard data={data} nowMs={nowMs} />
            <GanttChart data={data} nowMs={nowMs} />
          </>
        )}
      </div>
    </main>
  );
}
