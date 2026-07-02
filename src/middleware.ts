import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

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
  const isDashboardRoute = path.startsWith("/dashboard");

  // CORS check for API routes
  if (isApiRoute) {
    if (origin && !ALLOWED_ORIGINS.includes(origin)) {
      return NextResponse.json(
        { error: "CORS: Origin not allowed" },
        { status: 403 }
      );
    }
    return NextResponse.next();
  }

  // Auth check for dashboard routes
  if (isDashboardRoute) {
    const supabaseToken = req.cookies.get("sb-access-token")?.value ||
      req.cookies.get(`sb-${process.env.NEXT_PUBLIC_SUPABASE_URL?.split("//")[1]?.split(".")[0]}-auth-token`)?.value;

    if (!supabaseToken) {
      return NextResponse.redirect(new URL("/login", req.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/api/:path*", "/dashboard/:path*"],
};