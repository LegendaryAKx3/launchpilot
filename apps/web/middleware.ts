import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { auth0 } from "@/lib/auth0";

export async function middleware(request: NextRequest) {
  if (!auth0) {
    return NextResponse.next();
  }
  return auth0.middleware(request);
}

export const config = {
  matcher: ["/app/:path*"]
};
