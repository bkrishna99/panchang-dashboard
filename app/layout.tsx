import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Dublin Panchang",
  description: "Hora, Tithi, Nakshatra and daily muhurta timings for Dublin, Ireland",
};

// Fonts are loaded via a stylesheet link (rather than next/font) so the
// build doesn't need to reach fonts.googleapis.com at build time.
export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Fraunces:ital,wght@0,400;0,500;0,600;1,400;1,500&family=Inter:wght@400;500;600&family=IBM+Plex+Mono:wght@400;500;600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-full">{children}</body>
    </html>
  );
}
