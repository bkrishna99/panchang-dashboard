// Reference tables for classical Panchang calculations.
// Sources: standard Hindu luni-solar calendar conventions, and the published
// "Amrita Gadiya / Varjyam" nakshatra offset table (Karanam Ramakumar,
// "Panchangam Calculations"), cross-checked against its own worked examples.

export const TITHI_NAMES_IN_PAKSHA = [
  "Padyami (Pratipada)",
  "Vidiya (Dwitiya)",
  "Tadiya (Tritiya)",
  "Chaviti (Chaturthi)",
  "Panchami",
  "Shashti",
  "Saptami",
  "Ashtami",
  "Navami",
  "Dashami",
  "Ekadashi",
  "Dwadashi",
  "Trayodashi",
  "Chaturdashi",
];

export const NAKSHATRA_NAMES = [
  "Ashwini",
  "Bharani",
  "Krittika",
  "Rohini",
  "Mrigashira",
  "Ardra",
  "Punarvasu",
  "Pushyami",
  "Ashlesha",
  "Makha",
  "Pubba (Purva Phalguni)",
  "Uttara (Uttara Phalguni)",
  "Hasta",
  "Chitta (Chitra)",
  "Swati",
  "Vishakha",
  "Anuradha",
  "Jyeshtha",
  "Moola",
  "Purvashada",
  "Uttarashada",
  "Shravanam",
  "Dhanishta",
  "Shatabhisham",
  "Purvabhadra",
  "Uttarabhadra",
  "Revati",
];

export const RASHI_NAMES = [
  "Mesha (Aries)",
  "Vrishabha (Taurus)",
  "Mithuna (Gemini)",
  "Karkataka (Cancer)",
  "Simha (Leo)",
  "Kanya (Virgo)",
  "Tula (Libra)",
  "Vrishchika (Scorpio)",
  "Dhanus (Sagittarius)",
  "Makara (Capricorn)",
  "Kumbha (Aquarius)",
  "Meena (Pisces)",
];

// X-values in "hours" assuming a 24-hour nakshatra span; the real start time
// is nakshatraStart + nakshatraDuration * (X/24), each window lasting
// nakshatraDuration * (1.6/24).
export const AMRIT_VARJYAM_TABLE: Record<string, { amrit: number; varjyam: number }> = {
  "Ashwini": { amrit: 16.8, varjyam: 20.0 },
  "Bharani": { amrit: 19.2, varjyam: 9.6 },
  "Krittika": { amrit: 21.6, varjyam: 12.0 },
  "Rohini": { amrit: 20.8, varjyam: 16.0 },
  "Mrigashira": { amrit: 15.2, varjyam: 5.6 },
  "Ardra": { amrit: 14.0, varjyam: 8.4 },
  "Punarvasu": { amrit: 21.6, varjyam: 12.0 },
  "Pushyami": { amrit: 17.6, varjyam: 8.0 },
  "Ashlesha": { amrit: 22.4, varjyam: 12.8 },
  "Makha": { amrit: 21.6, varjyam: 12.0 },
  "Pubba (Purva Phalguni)": { amrit: 17.6, varjyam: 8.0 },
  "Uttara (Uttara Phalguni)": { amrit: 16.8, varjyam: 7.2 },
  "Hasta": { amrit: 18.0, varjyam: 8.4 },
  "Chitta (Chitra)": { amrit: 17.6, varjyam: 8.0 },
  "Swati": { amrit: 15.2, varjyam: 5.6 },
  "Vishakha": { amrit: 15.2, varjyam: 5.6 },
  "Anuradha": { amrit: 13.6, varjyam: 4.0 },
  "Jyeshtha": { amrit: 15.2, varjyam: 5.6 },
  "Moola": { amrit: 17.6, varjyam: 8.0 },
  "Purvashada": { amrit: 19.2, varjyam: 9.6 },
  "Uttarashada": { amrit: 17.6, varjyam: 8.0 },
  "Shravanam": { amrit: 13.6, varjyam: 4.0 },
  "Dhanishta": { amrit: 13.6, varjyam: 4.0 },
  "Shatabhisham": { amrit: 16.8, varjyam: 7.2 },
  "Purvabhadra": { amrit: 16.0, varjyam: 6.4 },
  "Uttarabhadra": { amrit: 19.2, varjyam: 9.6 },
  "Revati": { amrit: 21.6, varjyam: 12.0 },
};

// Chaldean Hora cycle. The first hora of the Panchang day (starting at
// sunrise) is always the weekday's own ruling planet, then the cycle repeats.
export const HORA_CYCLE = ["Sun", "Venus", "Mercury", "Moon", "Saturn", "Jupiter", "Mars"] as const;

export const HORA_QUALITIES: Record<(typeof HORA_CYCLE)[number], string> = {
  Sun: "Vigorous",
  Venus: "Beneficial",
  Mercury: "Quick",
  Moon: "Gentle",
  Saturn: "Sluggish",
  Jupiter: "Fruitful",
  Mars: "Aggressive",
};

// 0=Sunday ... 6=Saturday, matching JS Date#getDay()
export const WEEKDAY_RULER_INDEX = [0, 3, 6, 2, 5, 1, 4]; // index into HORA_CYCLE

export const WEEKDAY_NAMES = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];
