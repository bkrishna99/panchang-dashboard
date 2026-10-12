export const LOCATIONS = {
  ireland: {
    name: "Dublin, Ireland",
    latitude: 53.3498,
    longitude: -6.2603,
    elevation: 20,
    timeZone: "Europe/Dublin",
  },
  india: {
    name: "New Delhi, India",
    latitude: 28.6139,
    longitude: 77.209,
    elevation: 216,
    timeZone: "Asia/Kolkata",
  },
} as const;

export type LocationId = keyof typeof LOCATIONS;
