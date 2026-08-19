import { DateTime } from "luxon";
import {
  addHours,
  findNextBoundaryForward,
  findSunWindow,
  hoursBetween,
  moonSiderealLongitude,
  moonTropicalLongitude,
  normalizeDeg,
  sunSiderealLongitude,
  sunTropicalLongitude,
  type Observer,
} from "./ephemeris";
import {
  AMRIT_VARJYAM_TABLE,
  HORA_CYCLE,
  HORA_QUALITIES,
  NAKSHATRA_NAMES,
  RASHI_NAMES,
  TITHI_NAMES_IN_PAKSHA,
  WEEKDAY_NAMES,
  WEEKDAY_RULER_INDEX,
} from "./tables";
import type {
  HoraSlot,
  NakshatraInfo,
  PanchangData,
  SpecialDay,
  TimeWindow,
  TithiInfo,
} from "./types";

const NAKSHATRA_SPAN = 360 / 27;

function elongationFn(d: Date): number {
  return normalizeDeg(moonTropicalLongitude(d) - sunTropicalLongitude(d));
}

function siderealMoonFn(d: Date): number {
  return moonSiderealLongitude(d);
}

interface TithiOccurrence {
  number: number;
  start: Date;
  end: Date;
}

function tithiName(number: number): string {
  if (number === 15) return "Purnima (Full Moon)";
  if (number === 30) return "Amavasya (New Moon)";
  const idx = number <= 15 ? number - 1 : number - 16;
  const paksha = number <= 15 ? "Shukla" : "Krishna";
  return `${paksha} ${TITHI_NAMES_IN_PAKSHA[idx]}`;
}

function tithiOccurrenceAt(at: Date): TithiOccurrence {
  const elong = elongationFn(at);
  const number = Math.floor(elong / 12) + 1; // 1..30
  const end = findNextBoundaryForward(elongationFn, at, number * 12, 48);
  const start = findNextBoundaryForward(elongationFn, addHours(at, -30), (number - 1) * 12, 40);
  return { number, start, end };
}

/** All tithi occurrences that overlap [windowStart, windowEnd). */
function tithiOccurrencesInWindow(windowStart: Date, windowEnd: Date): TithiOccurrence[] {
  const occurrences: TithiOccurrence[] = [];
  let cursor = windowStart;
  for (let i = 0; i < 3; i++) {
    const occ = tithiOccurrenceAt(cursor);
    occurrences.push(occ);
    if (occ.end >= windowEnd) break;
    cursor = addHours(occ.end, 0.02); // nudge past the boundary
  }
  return occurrences;
}

interface NakshatraOccurrence {
  index: number;
  start: Date;
  end: Date;
}

function nakshatraOccurrenceAt(at: Date): NakshatraOccurrence {
  const sidLon = siderealMoonFn(at);
  const index = Math.floor(sidLon / NAKSHATRA_SPAN);
  const end = findNextBoundaryForward(siderealMoonFn, at, (index + 1) * NAKSHATRA_SPAN, 48);
  const start = findNextBoundaryForward(siderealMoonFn, addHours(at, -32), index * NAKSHATRA_SPAN, 42);
  return { index, start, end };
}

function nakshatraOccurrencesInWindow(windowStart: Date, windowEnd: Date): NakshatraOccurrence[] {
  const occurrences: NakshatraOccurrence[] = [];
  let cursor = windowStart;
  for (let i = 0; i < 3; i++) {
    const occ = nakshatraOccurrenceAt(cursor);
    occurrences.push(occ);
    if (occ.end >= windowEnd) break;
    cursor = addHours(occ.end, 0.02);
  }
  return occurrences;
}

function buildHora(sunrise: Date, sunset: Date, nextSunrise: Date, weekdayIndex: number): HoraSlot[] {
  const dayDurationHrs = hoursBetween(sunrise, sunset);
  const nightDurationHrs = hoursBetween(sunset, nextSunrise);
  const dayStep = dayDurationHrs / 12;
  const nightStep = nightDurationHrs / 12;
  const rulerIndex = WEEKDAY_RULER_INDEX[weekdayIndex];

  const slots: HoraSlot[] = [];
  for (let k = 0; k < 24; k++) {
    const planet = HORA_CYCLE[(rulerIndex + k) % 7];
    const isDay = k < 12;
    const start = isDay ? addHours(sunrise, k * dayStep) : addHours(sunset, (k - 12) * nightStep);
    const end = isDay ? addHours(sunrise, (k + 1) * dayStep) : addHours(sunset, (k - 11) * nightStep);
    slots.push({
      planet,
      quality: HORA_QUALITIES[planet],
      isDay,
      start: start.toISOString(),
      end: end.toISOString(),
    });
  }
  return slots;
}

function windowFrom(start: Date, durationHrs: number): TimeWindow {
  return { start: start.toISOString(), end: addHours(start, durationHrs).toISOString() };
}

function computeRahuKalam(sunrise: Date, dayDurationHrs: number, weekdayIndex: number): TimeWindow {
  const fractions = [0.875, 0.125, 0.75, 0.5, 0.625, 0.375, 0.25]; // Sun..Sat
  const start = addHours(sunrise, dayDurationHrs * fractions[weekdayIndex]);
  return windowFrom(start, dayDurationHrs * 0.125);
}

function computeGulikaKalam(sunrise: Date, dayDurationHrs: number, weekdayIndex: number): TimeWindow {
  const fractions = [0.75, 0.625, 0.5, 0.375, 0.25, 0.125, 0]; // Sun..Sat
  const start = addHours(sunrise, dayDurationHrs * fractions[weekdayIndex]);
  return windowFrom(start, dayDurationHrs * 0.125);
}

function computeYamaganda(sunrise: Date, dayDurationHrs: number, weekdayIndex: number): TimeWindow {
  const fractions = [0.5, 0.375, 0.25, 0.125, 0, 0.75, 0.625]; // Sun..Sat
  const start = addHours(sunrise, dayDurationHrs * fractions[weekdayIndex]);
  return windowFrom(start, dayDurationHrs * 0.125);
}

// 8th of 15 equal day-muhurtas, centered on solar noon; excluded on Wednesdays
// per classical convention (Wednesday/Mercury is considered antagonistic to
// Abhijit).
function computeAbhijitMuhurta(sunrise: Date, dayDurationHrs: number, weekdayIndex: number): TimeWindow | null {
  if (weekdayIndex === 3) return null; // Wednesday
  const muhurtaHrs = dayDurationHrs / 15;
  const start = addHours(sunrise, muhurtaHrs * 7);
  return windowFrom(start, muhurtaHrs);
}

function computeDurMuhurtam(
  sunrise: Date,
  sunset: Date,
  dayDurationHrs: number,
  nightDurationHrs: number,
  weekdayIndex: number
): TimeWindow[] {
  // Each entry: [basis, fraction] where basis 'day' measures from sunrise
  // using day duration, 'night' measures from sunset using night duration.
  const plan: Record<number, { basis: "day" | "night"; frac: number }[]> = {
    0: [{ basis: "day", frac: 10.4 / 12 }], // Sunday
    1: [
      { basis: "day", frac: 6.4 / 12 },
      { basis: "day", frac: 8.8 / 12 },
    ], // Monday
    2: [
      { basis: "day", frac: 2.4 / 12 },
      { basis: "night", frac: 4.8 / 12 },
    ], // Tuesday
    3: [{ basis: "day", frac: 5.6 / 12 }], // Wednesday
    4: [
      { basis: "day", frac: 4 / 12 },
      { basis: "day", frac: 8.8 / 12 },
    ], // Thursday
    5: [
      { basis: "day", frac: 2.4 / 12 },
      { basis: "day", frac: 6.4 / 12 },
    ], // Friday
    6: [{ basis: "day", frac: 1.6 / 12 }], // Saturday
  };
  return plan[weekdayIndex].map(({ basis, frac }) => {
    const base = basis === "day" ? sunrise : sunset;
    const durationHrs = basis === "day" ? dayDurationHrs : nightDurationHrs;
    const start = addHours(base, durationHrs * frac);
    return windowFrom(start, durationHrs * (0.8 / 12));
  });
}

function computeVarjyamAmrit(nakOccurrences: NakshatraOccurrence[]) {
  const varjyam: TimeWindow[] = [];
  const amritKalam: TimeWindow[] = [];
  for (const occ of nakOccurrences) {
    const name = NAKSHATRA_NAMES[occ.index];
    const table = AMRIT_VARJYAM_TABLE[name];
    if (!table) continue;
    const durationHrs = hoursBetween(occ.start, occ.end);
    const varjyamStart = addHours(occ.start, durationHrs * (table.varjyam / 24));
    const amritStart = addHours(occ.start, durationHrs * (table.amrit / 24));
    const windowDuration = durationHrs * (1.6 / 24);
    varjyam.push(windowFrom(varjyamStart, windowDuration));
    amritKalam.push(windowFrom(amritStart, windowDuration));
  }
  return { varjyam, amritKalam };
}

function detectSpecialDays(
  tithiOccurrences: TithiOccurrence[],
  sunrise: Date,
  sunset: Date,
  weekdayIndex: number
): SpecialDay[] {
  const special: SpecialDay[] = [];
  const seen = new Set<string>();

  const add = (title: string, description: string) => {
    if (seen.has(title)) return;
    seen.add(title);
    special.push({ title, description });
  };

  for (const occ of tithiOccurrences) {
    const n = occ.number;
    if (n === 30) {
      add("Amavasya", "New moon tithi — traditionally a day for ancestor remembrance (tarpanam/shraddha) and quiet reflection rather than new beginnings.");
    }
    if (n === 15) {
      add("Purnima", "Full moon tithi — considered auspicious for worship, fasting (Purnima vratham) and charitable acts.");
    }
    if (n === 11 || n === 26) {
      add("Ekadashi", "Ekadashi tithi — widely observed as a fasting (upavasa) day dedicated to Vishnu.");
    }
    if (n === 4) {
      add("Vinayaka Chaturthi (Shukla Chaturthi)", "Chaturthi in the waxing fortnight — associated with Ganesha worship; the monthly Vinayaka Chaturthi vratham falls here.");
    }
    if (n === 19) {
      add("Sankashti Chaturthi (Krishna Chaturthi)", "Chaturthi in the waning fortnight — the monthly Sankashti Chaturthi vratham, observed with a fast until moonrise, dedicated to Ganesha.");
    }
  }

  // Pradosham is specifically about Trayodashi tithi at/around sunset.
  const sunsetTithi = tithiOccurrenceAt(sunset);
  if (sunsetTithi.number === 13 || sunsetTithi.number === 28) {
    const dayName = WEEKDAY_NAMES[weekdayIndex];
    const label = dayName === "Monday" ? "Soma Pradosham" : dayName === "Saturday" ? "Shani Pradosham" : "Pradosham";
    add(label, "Trayodashi tithi at sunset — the Pradosha Kalam (evening twilight) window is traditionally reserved for Shiva worship.");
  }

  return special;
}

function detectSankranti(sunriseToday: Date, sunriseYesterday: Date): SpecialDay | null {
  const rashiToday = Math.floor(normalizeDeg(sunSiderealLongitude(sunriseToday)) / 30);
  const rashiYesterday = Math.floor(normalizeDeg(sunSiderealLongitude(sunriseYesterday)) / 30);
  if (rashiToday !== rashiYesterday) {
    return {
      title: `${RASHI_NAMES[rashiToday]} Sankranti`,
      description: `The Sun enters ${RASHI_NAMES[rashiToday]} today — a solar transit day, traditionally considered auspicious.`,
    };
  }
  return null;
}

export function computePanchang(observer: Observer, timeZone: string, now: Date = new Date()): PanchangData {
  // Find the Panchang day (sunrise -> next sunrise) that `now` falls in.
  const lookback = addHours(now, -26);
  const window = findSunWindow(observer, lookback);
  let { sunrise, sunset, nextSunrise } = window;
  if (sunrise > now) {
    // extremely defensive fallback; shouldn't trigger with a 26h lookback
    const window2 = findSunWindow(observer, addHours(now, -50));
    sunrise = window2.sunrise;
    sunset = window2.sunset;
    nextSunrise = window2.nextSunrise;
  }

  const localSunrise = DateTime.fromJSDate(sunrise, { zone: timeZone });
  const weekdayIndex = localSunrise.weekday % 7; // luxon: 1=Mon..7=Sun -> convert to 0=Sun..6=Sat
  const weekday = WEEKDAY_NAMES[weekdayIndex];

  const dayDurationHrs = hoursBetween(sunrise, sunset);
  const nightDurationHrs = hoursBetween(sunset, nextSunrise);

  const hora = buildHora(sunrise, sunset, nextSunrise, weekdayIndex);

  const tithiOccurrences = tithiOccurrencesInWindow(sunrise, nextSunrise);
  const primaryTithi = tithiOccurrences[0];
  const tithi: TithiInfo = {
    number: primaryTithi.number,
    paksha: primaryTithi.number <= 15 ? "Shukla" : "Krishna",
    name: tithiName(primaryTithi.number),
    start: primaryTithi.start.toISOString(),
    end: primaryTithi.end.toISOString(),
  };
  const nextTithiNumber = (primaryTithi.number % 30) + 1;
  const nextTithiName = tithiName(nextTithiNumber);

  const nakOccurrences = nakshatraOccurrencesInWindow(sunrise, nextSunrise);
  const nakshatras: NakshatraInfo[] = nakOccurrences.map((occ) => ({
    index: occ.index,
    name: NAKSHATRA_NAMES[occ.index],
    start: occ.start.toISOString(),
    end: occ.end.toISOString(),
  }));

  const rahuKalam = computeRahuKalam(sunrise, dayDurationHrs, weekdayIndex);
  const yamaganda = computeYamaganda(sunrise, dayDurationHrs, weekdayIndex);
  const gulikaKalam = computeGulikaKalam(sunrise, dayDurationHrs, weekdayIndex);
  const abhijitMuhurta = computeAbhijitMuhurta(sunrise, dayDurationHrs, weekdayIndex);
  const durMuhurtam = computeDurMuhurtam(sunrise, sunset, dayDurationHrs, nightDurationHrs, weekdayIndex);
  const { varjyam, amritKalam } = computeVarjyamAmrit(nakOccurrences);

  const specialDays = detectSpecialDays(tithiOccurrences, sunrise, sunset, weekdayIndex);
  const yesterdaySunrise = findSunWindow(observer, addHours(sunrise, -30)).sunrise;
  const sankranti = detectSankranti(sunrise, yesterdaySunrise);
  if (sankranti) specialDays.unshift(sankranti);

  return {
    location: "",
    generatedAt: new Date().toISOString(),
    date: localSunrise.toFormat("yyyy-MM-dd"),
    weekday,
    sunrise: sunrise.toISOString(),
    sunset: sunset.toISOString(),
    nextSunrise: nextSunrise.toISOString(),
    hora,
    tithi,
    nextTithiName,
    nakshatras,
    rahuKalam,
    yamaganda,
    gulikaKalam,
    abhijitMuhurta,
    durMuhurtam,
    varjyam,
    amritKalam,
    specialDays,
  };
}
