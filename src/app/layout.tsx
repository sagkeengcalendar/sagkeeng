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
  metadataBase: new URL("https://miina.example"),
  title: "miina — Community Calendars",
  description:
    "miina — community calendars for First Nations. Events, ceremonies, and notices with text reminders. miinawaa · again and again.",
  keywords: [
    "miina",
    "community calendar",
    "First Nations",
    "events",
    "ceremonies",
    "text reminders",
  ],
  openGraph: {
    title: "miina — community calendars for First Nations",
    description:
      "Events, ceremonies, and notices with text reminders so nobody misses what matters. miinawaa · again and again.",
    type: "website",
    images: [{ url: "/hero/og-image.webp" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "miina — Community Calendars",
    description: "Events, ceremonies, and notices with text reminders.",
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
