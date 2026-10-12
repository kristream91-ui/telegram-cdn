import { NextResponse } from "next/server";
import pkg from "@/package.json";

/* A one-tap, verifiable answer to "is this really React/Next or still vanilla?".
   Open /api/stack on the deployed site and it reports exactly what is running. */
export const dynamic = "force-static";

export function GET() {
  const deps = pkg.dependencies || {};
  const dev = (pkg as any).devDependencies || {};
  return NextResponse.json({
    app: "Ani77",
    frontend: "Next.js (App Router) — React components, client + server",
    next: deps.next,
    react: deps.react,
    "react-dom": deps["react-dom"],
    tailwindcss: dev.tailwindcss,
    typescript: dev.typescript,
    video: deps["mpegts.js"],
    routing: "next/navigation — real URL paths (e.g. /watch/<id>), not #hash routing",
    backend: "Python · FastAPI · Pyrogram bot (separate service on Render)",
    note: "The old vanilla frontend (app.js/style.css) only lives inside the Python service.",
  });
}
