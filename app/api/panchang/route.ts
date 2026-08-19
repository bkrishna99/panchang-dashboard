import { NextResponse } from "next/server";
import { computePanchang } from "@/lib/panchang/compute";
import { LOCATION } from "@/lib/panchang/location";

export const revalidate = 300; // recompute at most every 5 minutes

export async function GET() {
  const data = computePanchang(
    { latitude: LOCATION.latitude, longitude: LOCATION.longitude, elevation: LOCATION.elevation },
    LOCATION.timeZone,
    new Date()
  );
  data.location = LOCATION.name;
  return NextResponse.json(data, {
    headers: { "Cache-Control": "s-maxage=300, stale-while-revalidate=600" },
  });
}
