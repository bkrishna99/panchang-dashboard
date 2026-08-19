import * as Astronomy from "astronomy-engine";

export function normalizeDeg(deg: number): number {
  let d = deg % 360;
  if (d < 0) d += 360;
  return d;
}

/** Apparent geocentric tropical (Sayana) ecliptic longitude of the Sun, in degrees. */
export function sunTropicalLongitude(date: Date): number {
  return normalizeDeg(Astronomy.SunPosition(date).elon);
}

/** Apparent geocentric tropical (Sayana) ecliptic longitude of the Moon, in degrees. */
export function moonTropicalLongitude(date: Date): number {
  return normalizeDeg(Astronomy.EclipticGeoMoon(date).lon);
}

/**
 * Lahiri-style (Chitrapaksha) ayanamsa approximation, in degrees.
 * Formula per Karanam Ramakumar, "Panchangam Calculations" (verified against
 * its own worked example: 15-7-2009 -> 23.9928962 deg).
 * Accurate to within a few arc-minutes for the modern era, which is well
 * within the precision this dashboard needs.
 */
export function ayanamsa(date: Date): number {
  const y = date.getUTCFullYear();
  const m = date.getUTCMonth() + 1;
  const d = date.getUTCDate();
  const Y = y / 1000;
  const A = -6.92416 + 16.90709 * Y - 0.757371 * Y * Y;
  const B = (m - 1 + d / 30) * (1.1574074 / 1000);
  return A + B;
}

export function moonSiderealLongitude(date: Date): number {
  return normalizeDeg(moonTropicalLongitude(date) - ayanamsa(date));
}

export function sunSiderealLongitude(date: Date): number {
  return normalizeDeg(sunTropicalLongitude(date) - ayanamsa(date));
}

export interface Observer {
  latitude: number;
  longitude: number;
  elevation: number;
}

function toAstronomyObserver(o: Observer) {
  return new Astronomy.Observer(o.latitude, o.longitude, o.elevation);
}

/**
 * Find sunrise at/after `from`, the sunset that follows it (ending that solar
 * day), and the sunrise that follows THAT (needed to size the night for
 * Hora/Dur Muhurtam, since the Panchang day runs sunrise-to-next-sunrise).
 * `direction` +1 searches for a rise event, -1 for a set event; both search
 * forward in time from the given start.
 */
export function findSunWindow(observer: Observer, from: Date) {
  const obs = toAstronomyObserver(observer);
  const sunrise = Astronomy.SearchRiseSet(Astronomy.Body.Sun, obs, +1, from, 400);
  if (!sunrise) throw new Error("Could not find sunrise");
  const sunset = Astronomy.SearchRiseSet(Astronomy.Body.Sun, obs, -1, sunrise.date, 400);
  if (!sunset) throw new Error("Could not find sunset");
  const nextSunrise = Astronomy.SearchRiseSet(Astronomy.Body.Sun, obs, +1, sunset.date, 400);
  if (!nextSunrise) throw new Error("Could not find next sunrise");
  return {
    sunrise: sunrise.date,
    sunset: sunset.date,
    nextSunrise: nextSunrise.date,
  };
}

export function addHours(date: Date, hours: number): Date {
  return new Date(date.getTime() + hours * 3600 * 1000);
}

export function hoursBetween(a: Date, b: Date): number {
  return (b.getTime() - a.getTime()) / 3600000;
}

/**
 * Build an unwrapped (monotonically increasing) series of a cyclic angular
 * quantity sampled hourly from `start` for `hours` hours, so we can find
 * crossing times without worrying about the 360->0 wraparound.
 */
function buildUnwrappedSeries(
  fn: (d: Date) => number,
  start: Date,
  hours: number,
  stepHours = 1
) {
  const points: { t: Date; value: number }[] = [];
  let prevRaw = fn(start);
  let unwrapped = prevRaw;
  points.push({ t: start, value: unwrapped });
  const steps = Math.ceil(hours / stepHours);
  for (let i = 1; i <= steps; i++) {
    const t = addHours(start, i * stepHours);
    const raw = fn(t);
    let delta = raw - prevRaw;
    if (delta < -180) delta += 360;
    if (delta > 180) delta -= 360;
    unwrapped += delta;
    points.push({ t, value: unwrapped });
    prevRaw = raw;
  }
  return points;
}

/**
 * Find the first time at/after `start` where the unwrapped value of `fn`
 * reaches `targetAbsolute` (an unwrapped angle, i.e. may exceed 360).
 * Uses hourly sampling + linear interpolation between the bracketing points.
 */
export function findCrossingTime(
  fn: (d: Date) => number,
  start: Date,
  targetAbsolute: number,
  searchHours = 72
): Date {
  const series = buildUnwrappedSeries(fn, start, searchHours);
  for (let i = 1; i < series.length; i++) {
    const a = series[i - 1];
    const b = series[i];
    if (a.value <= targetAbsolute && targetAbsolute <= b.value) {
      const frac = (targetAbsolute - a.value) / (b.value - a.value);
      return new Date(a.t.getTime() + frac * (b.t.getTime() - a.t.getTime()));
    }
  }
  // Fallback: extrapolate from the last two points if not found (shouldn't
  // normally happen within the search window).
  const last = series[series.length - 1];
  const prev = series[series.length - 2];
  const rate = (last.value - prev.value); // per stepHours
  const stepsNeeded = (targetAbsolute - last.value) / rate;
  return addHours(last.t, stepsNeeded);
}

/**
 * Find the first time at/after `referenceTime` where cyclic quantity `fn`
 * (mod 360) reaches an absolute value congruent to `boundaryMod` (mod 360),
 * searching only forward. Works for both "when does this end" (referenceTime
 * = now) and "when did this start" (referenceTime = a safe lookback point,
 * e.g. now minus the maximum possible period) use cases.
 */
export function findNextBoundaryForward(
  fn: (d: Date) => number,
  referenceTime: Date,
  boundaryMod: number,
  searchHours: number
): Date {
  const refValue = normalizeDeg(fn(referenceTime));
  let target = normalizeDeg(boundaryMod);
  while (target < refValue) target += 360;
  return findCrossingTime(fn, referenceTime, target, searchHours);
}
