import type { Metadata, Viewport } from "next";
import { Bricolage_Grotesque, Caveat, Fraunces, IBM_Plex_Mono, Newsreader } from "next/font/google";
import "./globals.css";

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  style: ["normal", "italic"],
  axes: ["opsz", "SOFT", "WONK"],
  display: "swap",
});

const newsreader = Newsreader({
  variable: "--font-newsreader",
  subsets: ["latin"],
  style: ["normal", "italic"],
  axes: ["opsz"],
  display: "swap",
});

const bricolage = Bricolage_Grotesque({
  variable: "--font-bricolage",
  subsets: ["latin"],
  axes: ["opsz", "wdth"],
  display: "swap",
});

const plexMono = IBM_Plex_Mono({
  variable: "--font-plex-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
  display: "swap",
});

const caveat = Caveat({
  variable: "--font-caveat",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Subtext — independent bookshop, living shelf",
    template: "%s — Subtext",
  },
  description:
    "A digital shelf that answers to what you want to feel. Discover books by atmosphere, pace and intent, curated by an independent bookshop.",
};

export const viewport: Viewport = {
  themeColor: "#ece5d6",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${fraunces.variable} ${newsreader.variable} ${bricolage.variable} ${plexMono.variable} ${caveat.variable}`}
    >
      <body>{children}</body>
    </html>
  );
}
