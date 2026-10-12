import { NextResponse } from "next/server";
import { DateTime } from "luxon";
import { computePanchang } from "@/lib/panchang/compute";
import { LOCATIONS, type LocationId } from "@/lib/panchang/location";

export const revalidate = 300; // recompute at most every 5 minutes

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const requestedLocation = params.get("location") ?? "ireland";
  if (!Object.prototype.hasOwnProperty.call(LOCATIONS, requestedLocation)) {
    return NextResponse.json({ error: "Unsupported location" }, { status: 400 });
  }
  const locationId = requestedLocation as LocationId;
  const location = LOCATIONS[locationId];

  const date = params.get("date");
  const selectedDate = date
    ? DateTime.fromISO(date, { zone: location.timeZone })
    : DateTime.now().setZone(location.timeZone);
  if (!selectedDate.isValid || (date !== null && selectedDate.toFormat("yyyy-MM-dd") !== date)) {
    return NextResponse.json({ error: "Date must be a valid yyyy-MM-dd date" }, { status: 400 });
  }

  // Noon ensures the requested local date falls within its sunrise-to-sunrise Panchang day.
  const calculationTime = selectedDate.set({ hour: 12, minute: 0, second: 0, millisecond: 0 }).toJSDate();
  const data = computePanchang(
    { latitude: location.latitude, longitude: location.longitude, elevation: location.elevation },
    location.timeZone,
    calculationTime
  );
  data.location = location.name;
  return NextResponse.json(data, {
    headers: { "Cache-Control": "s-maxage=300, stale-while-revalidate=600" },
  });
}
