export interface TimeWindow {
  start: string; // ISO datetime
  end: string; // ISO datetime
}

export interface HoraSlot extends TimeWindow {
  planet: string;
  quality: string;
  isDay: boolean;
}

export interface TithiInfo {
  number: number; // 1-30
  paksha: "Shukla" | "Krishna";
  name: string;
  start: string;
  end: string;
}

export interface NakshatraInfo {
  index: number; // 0-26
  name: string;
  start: string;
  end: string;
}

export interface SpecialDay {
  title: string;
  description: string;
}

export interface PanchangData {
  location: string;
  generatedAt: string;
  date: string; // yyyy-MM-dd, Panchang day (sunrise-based) in local time
  weekday: string;
  sunrise: string;
  sunset: string;
  nextSunrise: string;
  hora: HoraSlot[];
  tithi: TithiInfo;
  nextTithiName: string;
  nakshatras: NakshatraInfo[];
  rahuKalam: TimeWindow;
  yamaganda: TimeWindow;
  gulikaKalam: TimeWindow;
  abhijitMuhurta: TimeWindow | null; // null on Wednesdays (traditionally excluded)
  durMuhurtam: TimeWindow[];
  varjyam: TimeWindow[];
  amritKalam: TimeWindow[];
  specialDays: SpecialDay[];
}
