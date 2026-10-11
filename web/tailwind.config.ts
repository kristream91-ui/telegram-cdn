import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: "#050a14",
        bg2: "#081020",
        panel: "#0b1526",
        panel2: "#101d33",
        ink: "#eef4ff",
        muted: "#8a95a8",
        blue: { DEFAULT: "#00aeef", 2: "#00d4ff" },
        gold: "#ffb800",
        danger: "#f43f5e",
      },
      fontFamily: {
        sans: ["var(--font-poppins)", "system-ui", "sans-serif"],
        display: ["var(--font-bebas)", "var(--font-poppins)", "sans-serif"],
      },
      borderColor: { line: "rgba(120,160,255,.10)" },
      boxShadow: {
        glow: "0 0 0 2px rgba(0,174,239,.55), 0 0 26px rgba(0,174,239,.35)",
        soft: "0 10px 34px rgba(0,0,0,.55)",
      },
      keyframes: {
        rise: { from: { opacity: "0", transform: "translateY(22px)" } },
        cardIn: { from: { opacity: "0", transform: "translateY(26px) scale(.96)" } },
        shimmer: { to: { backgroundPosition: "-200% 0" } },
        heroZoom: { from: { transform: "scale(1.08)" } },
        floaty: { "0%,100%": { transform: "translateY(0)" }, "50%": { transform: "translateY(-12px)" } },
      },
      animation: {
        rise: "rise .65s cubic-bezier(.22,.9,.32,1) both",
        cardIn: "cardIn .5s cubic-bezier(.22,.9,.32,1) both",
        shimmer: "shimmer 1.3s infinite",
        heroZoom: "heroZoom 16s ease-out both",
        floaty: "floaty 5s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};
export default config;
