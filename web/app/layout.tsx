import type { Metadata, Viewport } from "next";
import { Poppins, Bebas_Neue } from "next/font/google";
import AppShell from "@/components/AppShell";
import { API_BASE } from "@/lib/api";
import "./globals.css";

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
  variable: "--font-poppins",
  display: "swap",
});
const bebas = Bebas_Neue({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-bebas",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Ani77 — Stream Hindi Dub Anime",
  description: "A hand-picked Hindi dub anime library — stream instantly, anywhere.",
  icons: { icon: `${API_BASE}/static/favicon.png` },
};

export const viewport: Viewport = {
  themeColor: "#050a14",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${poppins.variable} ${bebas.variable}`}>
      <body>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
