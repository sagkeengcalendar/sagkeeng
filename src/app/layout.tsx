import type { Metadata } from "next";
import { Fraunces, Hanken_Grotesk, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  axes: ["opsz", "SOFT"],
  display: "swap",
});

const hanken = Hanken_Grotesk({
  variable: "--font-hanken",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://sagkeeng.example"),
  title: "Sagkeeng Anicinabe Nation — Community Calendar",
  description:
    "Events, ceremonies, and notices for Sagkeeng Anicinabe Nation. Zaagiing — Mouth of the River.",
  keywords: [
    "Sagkeeng",
    "Anicinabe",
    "community calendar",
    "events",
    "ceremonies",
    "Treaty Days",
  ],
  openGraph: {
    title: "Win the grand prize this year at Treaty Days — RSVP now!",
    description:
      "See all Sagkeeng events and RSVP to enter the draw. Sagkeeng Anicinabe Nation Community Calendar.",
    type: "website",
    images: [{ url: "/hero/og-image.webp" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Sagkeeng Anicinabe Nation — Community Calendar",
    description: "Events, ceremonies, and notices. RSVP to enter the draw.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" data-theme="light" suppressHydrationWarning>
      <body
        className={`${fraunces.variable} ${hanken.variable} ${geistMono.variable} antialiased`}
      >
        {children}
        <Toaster />
      </body>
    </html>
  );
}
