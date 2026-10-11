import type { Config } from "tailwindcss";

/* Palette pulled straight from Ani77logo.png:
   deep navy #0c2454 -> vivid blue #0c84fc on near-black, white highlights.
   No gold anywhere — the logo has none. */
const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: "#04091a",
        bg2: "#071026",
        panel: "#0a1730",
        panel2: "#0e2246",
        ink: "#f2f7ff",
        muted: "#8fa3c4",
        navy: "#0c2454",
        deep: "#0c54b4",
        blue: { DEFAULT: "#0c84fc", 2: "#35a2ff" },
        accent: "#35a2ff",
        danger: "#f4526b",
      },
      fontFamily: {
        sans: ["var(--font-poppins)", "system-ui", "sans-serif"],
        display: ["var(--font-bebas)", "var(--font-poppins)", "sans-serif"],
      },
      borderColor: { line: "rgba(90,150,255,.14)" },
      boxShadow: {
        glow: "0 0 0 2px rgba(12,132,252,.55), 0 0 28px rgba(12,132,252,.35)",
        soft: "0 12px 38px rgba(2,6,18,.6)",
        card: "0 2px 10px rgba(2,6,18,.45)",
        lift: "0 16px 40px rgba(4,10,26,.7)",
      },
      backgroundImage: {
        "logo-grad": "linear-gradient(135deg,#0c54b4 0%,#0c84fc 55%,#35a2ff 100%)",
        "panel-grad": "linear-gradient(160deg,#0d1f3f 0%,#0a1730 60%)",
      },
      keyframes: {
        rise: { from: { opacity: "0", transform: "translateY(22px)" } },
        cardIn: { from: { opacity: "0", transform: "translateY(26px) scale(.96)" } },
        heroZoom: { from: { transform: "scale(1.08)" } },
        floaty: { "0%,100%": { transform: "translateY(0)" }, "50%": { transform: "translateY(-12px)" } },
        pulseGlow: {
          "0%,100%": { opacity: ".55" },
          "50%": { opacity: "1" },
        },
        sweep: { from: { transform: "translateX(-120%)" }, to: { transform: "translateX(220%)" } },
      },
      animation: {
        rise: "rise .65s cubic-bezier(.22,.9,.32,1) both",
        cardIn: "cardIn .5s cubic-bezier(.22,.9,.32,1) both",
        heroZoom: "heroZoom 16s ease-out both",
        floaty: "floaty 5s ease-in-out infinite",
        pulseGlow: "pulseGlow 4s ease-in-out infinite",
        sweep: "sweep 1.1s ease-in-out",
      },
    },
  },
  plugins: [],
};
export default config;
