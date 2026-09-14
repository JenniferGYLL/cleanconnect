import type { Metadata, Viewport } from "next";
import { Fraunces, Manrope, IBM_Plex_Mono } from "next/font/google";
import { PwaRegister } from "@/components/pwa/PwaRegister";
import "./globals.css";

// Manrope: quiet, precise, geometric UI sans for body copy and interface
// text — deliberately not Inter/Roboto.
const body = Manrope({
  subsets: ["latin"],
  variable: "--font-body",
  display: "swap",
});

// Fraunces: an editorial serif with soft-tech optical sizing. Used only for
// display headlines — the thing that should feel premium and considered
// rather than like a standard SaaS headline.
const display = Fraunces({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
});

// IBM Plex Mono: used sparingly for technical/precise details — eyebrow
// labels, timestamps, the DOT wordmark — to reinforce the "architectural
// technology" register without adding a second display face.
const mono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "DOT",
  description:
    "DOT connects property managers, contractors and residents around one shared, evidence-backed record of building services.",
  manifest: "/manifest.json",
  icons: {
    icon: [
      { url: "/favicon.ico" },
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180" }],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "DOT",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#17191b",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${body.variable} ${display.variable} ${mono.variable}`}
    >
      <body>
        <PwaRegister />
        {children}
      </body>
    </html>
  );
}
