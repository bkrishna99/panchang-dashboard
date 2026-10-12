import { DateTime } from "luxon";
import { PanchangDashboard } from "@/components/PanchangDashboard";
import { LOCATIONS } from "@/lib/panchang/location";

// The selected date must be calculated at request time, not frozen into a static build.
export const dynamic = "force-dynamic";

export default function Home() {
  const initialDate = DateTime.now()
    .setZone(LOCATIONS.ireland.timeZone)
    .toFormat("yyyy-MM-dd");

  return <PanchangDashboard initialDate={initialDate} />;
}
