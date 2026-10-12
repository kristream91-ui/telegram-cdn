import type { Metadata, Viewport } from "next";
import { Poppins, Chakra_Petch } from "next/font/google";
import AppShell from "@/components/AppShell";
import { API_BASE } from "@/lib/api";
import "./globals.css";

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-poppins",
  display: "swap",
});
/* angular, slanted, high-energy display face — closer to the logo's "77" */
const display = Chakra_Petch({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  style: ["normal", "italic"],
  variable: "--font-display",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Ani77 — Stream Hindi Dub Anime",
  description: "Your own premium OTT library, powered by Telegram. Stream Hindi dub anime anywhere.",
  icons: { icon: `${API_BASE}/static/favicon.png` },
};

export const viewport: Viewport = {
  themeColor: "#04070f",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${poppins.variable} ${display.variable}`}>
      <body>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
