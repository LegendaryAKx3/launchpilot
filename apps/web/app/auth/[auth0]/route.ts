import { NextResponse } from "next/server";

import { auth0, isAuthEnabled } from "@/lib/auth0";

function authActionFromRequest(request: Request) {
  const url = new URL(request.url);
  const parts = url.pathname.split("/").filter(Boolean);
  return parts[parts.length - 1] ?? "";
}

function authDisabledResponse() {
  return NextResponse.json(
    {
      error: "AUTH0_NOT_CONFIGURED",
      message: "Auth0 is required but is not configured for this deployment."
    },
    { status: 503 }
  );
}

function authRouteErrorResponse(error: unknown) {
  return NextResponse.json(
    {
      error: "AUTH0_ROUTE_ERROR",
      message: error instanceof Error ? error.message : "Unknown Auth0 route error.",
      hint: "Configure the required Auth0 environment variables for this deployment."
    },
    { status: 500 }
  );
}

export async function GET(request: Request) {
  if (!isAuthEnabled()) {
    return authDisabledResponse();
  }

  try {
    return auth0!.middleware(request);
  } catch (error) {
    return authRouteErrorResponse(error);
  }
}

export async function POST(request: Request) {
  if (!isAuthEnabled()) {
    return authDisabledResponse();
  }

  try {
    return auth0!.middleware(request);
  } catch (error) {
    return authRouteErrorResponse(error);
  }
}
