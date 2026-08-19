# Dublin Panchang Dashboard

A personal dashboard of Vedic Panchang info-tiles for **Dublin, Ireland**:

- **Venus & Jupiter Hora** — the day's good windows for starting things
- **Tithi** — today's lunar day, and exactly when it ends
- **Nakshatra** — today's lunar mansion, and when it ends
- **Rahu Kalam, Yamaganda, Gulika Kalam, Dur Muhurtam** — times to avoid
- **Varjyam & Amrit Kalam** — the nakshatra-based avoid/favorable windows
- **Festival & vratham callouts** — Ekadashi, Purnima, Amavasya, Sankashti /
  Vinayaka Chaturthi, Pradosham, and solar Sankranti days

Everything is **computed astronomically**, not scraped. Drikpanchang.com
(and most Panchang sites) render their tables client-side behind bot
detection, so there's no reliable way to scrape them from a serverless
function. Instead this app calculates sunrise/sunset and the Sun/Moon's real
ecliptic positions directly (via the [`astronomy-engine`](https://github.com/cosinekitty/astronomy-engine)
library) and applies the same classical formulas Panchang software uses.
See **"How it works"** below for the exact formulas and sources.

## Quick start

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

To sanity-check the raw numbers from the terminal (useful after changing
anything in `lib/panchang/`):

```bash
npm run panchang:check
```

## Changing the location

Everything is keyed off one config object:

```ts
// lib/panchang/location.ts
export const LOCATION = {
  name: "Dublin, Ireland",
  latitude: 53.3498,
  longitude: -6.2603,
  elevation: 20,
  timeZone: "Europe/Dublin",
};
```

Change the coordinates and IANA `timeZone` to retarget the whole dashboard
at a different city — no other code needs to change.

## Deploying: GitHub → Vercel

1. **Push to GitHub**

   ```bash
   git init
   git add -A
   git commit -m "Dublin Panchang dashboard"
   gh repo create panchang-dashboard --private --source=. --push
   # or manually: create a repo on github.com, then
   # git remote add origin <your-repo-url>
   # git branch -M main && git push -u origin main
   ```

2. **Import into Vercel**
   - Go to [vercel.com/new](https://vercel.com/new), pick the GitHub repo.
   - Framework preset: Vercel auto-detects **Next.js** — no config needed.
   - No environment variables required (there's no API key — everything is
     computed locally in the serverless function).
   - Click **Deploy**.

3. Done — the API route recomputes Panchang data at most once every 5
   minutes (`revalidate = 300` in `app/api/panchang/route.ts`), so the page
   stays cheap to serve while still reflecting the current day.

## How it works

All the astronomy lives in `lib/panchang/`:

| File | Responsibility |
|---|---|
| `location.ts` | The one place that defines where the dashboard is for |
| `ephemeris.ts` | Sun/Moon ecliptic longitude, ayanamsa, sunrise/sunset search, and a generic "find when this angle next reaches X" root-finder |
| `tables.ts` | Nakshatra/Tithi/Rashi names, the Hora cycle, and the classical Varjyam/Amrit-Kalam offset table |
| `compute.ts` | Orchestrates everything into one `PanchangData` object per request |

**Sunrise/sunset & planetary positions** come from `astronomy-engine`
(MIT-licensed, no external API calls, no network dependency at runtime —
it's a pure-JS ephemeris).

**Ayanamsa** uses a Lahiri/Chitrapaksha-style approximation formula
(from Karanam Ramakumar's published *"Panchangam Calculations"* notes),
accurate to within a few arc-minutes for the current era — plenty for
nakshatra/tithi boundaries to the nearest minute or so.

**Tithi** = (Moon longitude − Sun longitude) / 12°, giving a number 1–30.
**Nakshatra** = Moon's sidereal longitude / 13°20′, giving a number 0–26.
Both end-times are found by sampling the relevant angle hourly and
interpolating the crossing point — this also means "tithi kshaya" (a tithi
so short it never spans a sunrise) is handled automatically, exactly as
traditional Panchangams do.

**Hora** cycles through the classical Chaldean order (Sun → Venus →
Mercury → Moon → Saturn → Jupiter → Mars, repeating), starting from that
weekday's own ruling planet at sunrise, with each of the 24 slots sized to
1/12th of the day or night respectively.

**Rahu Kalam / Yamaganda / Gulika Kalam / Dur Muhurtam** use the standard
weekday-based fractions of day/night length (e.g. Thursday's Rahu Kalam =
sunrise + 0.625 × day-length), cross-checked against a published worked
example.

**Varjyam / Amrit Kalam** use the classical 27-Nakshatra offset table
(each nakshatra has its own "X" value in hours-out-of-24; the window starts
at `nakshatra_start + nakshatra_duration × X/24` and lasts
`nakshatra_duration × 1.6/24`).

**Festival/vratham detection** is purely Tithi-number-based (Ekadashi =
11th/26th tithi, Purnima = 15th, Amavasya = 30th, etc.) plus a solar
Sankranti check (comparing the Sun's sidereal rashi at consecutive
sunrises). This deliberately does **not** attempt a full fixed festival
calendar (Diwali, Ugadi, Navratri, ...) since those require resolving the
luni-solar month name, which has edge cases (adhika/kshaya months) that are
easy to get subtly wrong — the tithi-based occasions above are safe and
exact by construction.

### A note on precision

Because this is computed rather than sourced from a single canonical
Panchangam, exact minute-level boundaries — especially for Varjyam, Amrit
Kalam, and Nakshatra end-times — can differ by a few minutes from
drikpanchang.com or other published Panchangams, which sometimes use
slightly different ayanamsa values or regional conventions. Treat the
numbers as accurate and internally consistent, not as a byte-for-byte
mirror of any one source.

## Tech stack

- Next.js 16 (App Router) + TypeScript + Tailwind CSS v4
- `astronomy-engine` for ephemeris calculations
- `luxon` for timezone-aware date handling
- No database, no API keys, no external calls at request time
