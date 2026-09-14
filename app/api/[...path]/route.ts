// Runtime proxy to the tuitio-backend service. The browser only ever talks
// to this app's origin, so the backend can move (tunnel URL changes, PaaS
// migration) without rebuilding the frontend: the target is read from the
// environment at request time.
//
// The public REST API remains directly usable at its own URL; this proxy
// exists so the web app is origin-independent.

import { NextRequest, NextResponse } from "next/server";

const backendBase = () =>
  process.env.API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:8080";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const { path } = await params;
  const target = `${backendBase()}/api/${path.join("/")}${req.nextUrl.search}`;
  try {
    const res = await fetch(target, { cache: "no-store" });
    const body = await res.text();
    return new NextResponse(body, {
      status: res.status,
      headers: { "Content-Type": res.headers.get("Content-Type") ?? "application/json" },
    });
  } catch {
    return NextResponse.json(
      { error: "backend unavailable" },
      { status: 502 },
    );
  }
}
