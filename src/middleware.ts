import { NextRequest, NextResponse } from "next/server";

const ALLOWED_ORIGINS = [
  "http://localhost:3000",
  "http://localhost:3001",
  process.env.NEXT_PUBLIC_APP_URL || "",
].filter(Boolean);

export function middleware(req: NextRequest) {
  const origin = req.headers.get("origin") || "";
  const isApiRoute = req.nextUrl.pathname.startsWith("/api/");

  if (!isApiRoute) {
    return NextResponse.next();
  }

  // Allow same-origin requests
  if (!origin || ALLOWED_ORIGINS.includes(origin)) {
    return NextResponse.next();
  }

  // Block unknown origins
  return NextResponse.json(
    { error: "CORS: Origin not allowed" },
    { status: 403 }
  );
}

export const config = {
  matcher: "/api/:path*",
};