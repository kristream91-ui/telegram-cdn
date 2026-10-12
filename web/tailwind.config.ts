import type { Config } from "tailwindcss";

/* Palette straight off Ani77logo.png:
   cosmic black + deep navy, neon electric blue, cyan rim light,
   a rare amber accent (the character's eye / the sparks), stark white. */
const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: "#04070f",
        bg2: "#070f1f",
        panel: "#0a1526",
        panel2: "#0e2038",
        ink: "#f4f8ff",
        muted: "#8ba0c2",
        navy: "#0c2454",
        deep: "#0c54b4",
        blue: { DEFAULT: "#0c84fc", 2: "#35a2ff" },
        cyan: "#22e0ff",
        gold: "#ffb347",
        accent: "#35a2ff",
        danger: "#f4526b",
      },
      fontFamily: {
        sans: ["var(--font-poppins)", "system-ui", "sans-serif"],
        display: ["var(--font-display)", "var(--font-poppins)", "sans-serif"],
      },
      borderColor: { line: "rgba(90,150,255,.16)" },
      boxShadow: {
        glow: "0 0 0 1.5px rgba(34,224,255,.45), 0 0 26px rgba(12,132,252,.35)",
        bloom: "0 0 0 1.5px rgba(34,224,255,.7), 0 0 46px rgba(12,132,252,.6), 0 18px 50px rgba(0,0,0,.6)",
        soft: "0 14px 40px rgba(1,4,12,.66)",
        card: "0 2px 12px rgba(1,4,12,.5)",
        lift: "0 22px 60px rgba(2,6,18,.75)",
        ring: "0 0 0 2px rgba(12,132,252,.5), 0 0 30px rgba(34,224,255,.5)",
        goldglow: "0 0 20px rgba(255,179,71,.45)",
      },
      backgroundImage: {
        "logo-grad": "linear-gradient(135deg,#0c54b4 0%,#0c84fc 48%,#22e0ff 100%)",
        "logo-grad-soft": "linear-gradient(135deg,rgba(12,84,180,.22),rgba(34,224,255,.16))",
        "panel-grad": "linear-gradient(165deg,#0d1e38 0%,#0a1526 62%)",
        "hairline": "linear-gradient(90deg,transparent,rgba(34,224,255,.45),rgba(12,132,252,.35),transparent)",
        "card-sheen": "linear-gradient(105deg,transparent 35%,rgba(255,255,255,.16) 50%,transparent 65%)",
      },
      keyframes: {
        rise: { from: { opacity: "0", transform: "translateY(20px)" } },
        cardIn: { from: { opacity: "0", transform: "translateY(24px) scale(.97)" } },
        heroZoom: { from: { transform: "scale(1.09)" } },
        floaty: { "0%,100%": { transform: "translateY(0)" }, "50%": { transform: "translateY(-10px)" } },
        spinSlow: { to: { transform: "rotate(360deg)" } },
        sheen: { from: { transform: "translateX(-130%)" }, to: { transform: "translateX(230%)" } },
        twinkle: { "0%,100%": { opacity: ".25" }, "50%": { opacity: ".85" } },
        drift: { from: { transform: "translate3d(0,0,0)" }, to: { transform: "translate3d(-40px,-26px,0)" } },
        aurora: { "0%,100%": { opacity: ".55", transform: "translateX(-2%)" }, "50%": { opacity: ".9", transform: "translateX(2%)" } },
        shimmer: { to: { backgroundPosition: "-200% 0" } },
      },
      animation: {
        rise: "rise .6s cubic-bezier(.22,.9,.32,1) both",
        cardIn: "cardIn .5s cubic-bezier(.22,.9,.32,1) both",
        heroZoom: "heroZoom 18s ease-out both",
        floaty: "floaty 6s ease-in-out infinite",
        spinSlow: "spinSlow 26s linear infinite",
        sheen: "sheen 1.1s ease-in-out",
        twinkle: "twinkle 3.4s ease-in-out infinite",
        drift: "drift 40s linear infinite alternate",
        aurora: "aurora 12s ease-in-out infinite",
        shimmer: "shimmer 1.4s infinite",
      },
    },
  },
  plugins: [],
};
export default config;
