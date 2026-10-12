/* A one-tap, verifiable answer to "is this really React/Next or still vanilla?"
   Open /api/stack on the deployed site and it reports exactly what is running.
   Deliberately has zero imports so nothing can break the build. */
export const dynamic = "force-static";

const STACK = {
  app: "Ani77",
  frontend: "Next.js 14 (App Router) — React components, client + server",
  next: "14.2.35",
  react: "18.3.1",
  "react-dom": "18.3.1",
  tailwindcss: "3.4.6",
  typescript: "5.5.3",
  video: "mpegts.js 1.8.2",
  routing: "next/navigation — real URL paths (e.g. /watch/<id>), not #hash routing",
  backend: "Python · FastAPI · Pyrogram bot (separate service on Render)",
  note: "The old vanilla frontend (app.js / style.css) only lives inside the Python service.",
};

export function GET() {
  return new Response(JSON.stringify(STACK, null, 2), {
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" },
  });
}
