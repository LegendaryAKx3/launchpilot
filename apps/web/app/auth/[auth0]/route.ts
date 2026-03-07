import { NextResponse } from "next/server";

import { auth0, isAuthEnabled } from "@/lib/auth0";

function authActionFromRequest(request: Request) {
  const url = new URL(request.url);
  const parts = url.pathname.split("/").filter(Boolean);
  return parts[parts.length - 1] ?? "";
}

function authDisabledResponse(request: Request) {
  const action = authActionFromRequest(request);
  const redirectTo = action === "logout" ? "/login" : "/app";
  return NextResponse.redirect(new URL(redirectTo, request.url));
}

function authRouteErrorResponse(error: unknown) {
  return NextResponse.json(
    {
      error: "AUTH0_ROUTE_ERROR",
      message: error instanceof Error ? error.message : "Unknown Auth0 route error.",
      hint: "If you are in local dev, set AUTH_MODE=dev and use /app directly."
    },
    { status: 500 }
  );
}

export async function GET(request: Request) {
  if (!isAuthEnabled()) {
    return authDisabledResponse(request);
  }

  try {
    return auth0!.middleware(request);
  } catch (error) {
    return authRouteErrorResponse(error);
  }
}

export async function POST(request: Request) {
  if (!isAuthEnabled()) {
    return authDisabledResponse(request);
  }

  try {
    return auth0!.middleware(request);
  } catch (error) {
    return authRouteErrorResponse(error);
  }
}
