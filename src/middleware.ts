import { NextRequest, NextResponse } from "next/server";

const ALLOWED_ORIGINS = [
  "http://localhost:3000",
  "http://localhost:3001",
  "http://localhost:3002",
  "http://localhost:3003",
  process.env.NEXT_PUBLIC_APP_URL || "",
].filter(Boolean);

export async function middleware(req: NextRequest) {
  const origin = req.headers.get("origin") || "";
  const path = req.nextUrl.pathname;
  const isApiRoute = path.startsWith("/api/");

  // CORS check for API routes only
  if (isApiRoute) {
    if (origin && !ALLOWED_ORIGINS.includes(origin)) {
      return NextResponse.json(
        { error: "CORS: Origin not allowed" },
        { status: 403 }
      );
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/api/:path*", "/dashboard/:path*"],
};