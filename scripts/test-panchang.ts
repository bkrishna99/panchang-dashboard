import { computePanchang } from "../lib/panchang/compute";
import { LOCATION } from "../lib/panchang/location";
import { DateTime } from "luxon";

const now = new Date();
const data = computePanchang(
  { latitude: LOCATION.latitude, longitude: LOCATION.longitude, elevation: LOCATION.elevation },
  LOCATION.timeZone,
  now
);

function fmt(iso: string) {
  return DateTime.fromISO(iso, { zone: "utc" }).setZone(LOCATION.timeZone).toFormat("ccc dd LLL HH:mm");
}

console.log("=== Panchang for", LOCATION.name, "===");
console.log("Now:", fmt(now.toISOString()));
console.log("Panchang date:", data.date, data.weekday);
console.log("Sunrise:", fmt(data.sunrise));
console.log("Sunset:", fmt(data.sunset));
console.log("Next sunrise:", fmt(data.nextSunrise));

console.log("\n-- Tithi --");
console.log(data.tithi.name, "until", fmt(data.tithi.end), "| next:", data.nextTithiName);

console.log("\n-- Nakshatra(s) --");
for (const n of data.nakshatras) {
  console.log(n.name, fmt(n.start), "->", fmt(n.end));
}

console.log("\n-- Hora (Venus & Jupiter highlighted) --");
for (const h of data.hora) {
  const tag = h.planet === "Venus" || h.planet === "Jupiter" ? "  <<<" : "";
  console.log(`${h.isDay ? "day  " : "night"} ${h.planet.padEnd(8)} ${fmt(h.start)} -> ${fmt(h.end)}${tag}`);
}

console.log("\n-- Rahu Kalam --", fmt(data.rahuKalam.start), "->", fmt(data.rahuKalam.end));
console.log("-- Yamaganda  --", fmt(data.yamaganda.start), "->", fmt(data.yamaganda.end));
console.log("-- Gulika Kalam --", fmt(data.gulikaKalam.start), "->", fmt(data.gulikaKalam.end));
console.log(
  "-- Abhijit Muhurta --",
  data.abhijitMuhurta ? `${fmt(data.abhijitMuhurta.start)} -> ${fmt(data.abhijitMuhurta.end)}` : "(none today — Wednesday)"
);
console.log("-- Dur Muhurtam --");
for (const w of data.durMuhurtam) console.log("   ", fmt(w.start), "->", fmt(w.end));
console.log("-- Varjyam --");
for (const w of data.varjyam) console.log("   ", fmt(w.start), "->", fmt(w.end));
console.log("-- Amrit Kalam --");
for (const w of data.amritKalam) console.log("   ", fmt(w.start), "->", fmt(w.end));

console.log("\n-- Special days --");
if (data.specialDays.length === 0) console.log("(none)");
for (const s of data.specialDays) console.log(s.title, "-", s.description);

// Sanity checks
const dayDurHrs = (new Date(data.sunset).getTime() - new Date(data.sunrise).getTime()) / 3600000;
const nightDurHrs = (new Date(data.nextSunrise).getTime() - new Date(data.sunset).getTime()) / 3600000;
console.log("\nday hrs", dayDurHrs.toFixed(3), "night hrs", nightDurHrs.toFixed(3));
const lastHora = data.hora[data.hora.length - 1];
console.log("last hora end matches nextSunrise?", lastHora.end === data.nextSunrise, lastHora.end, data.nextSunrise);
