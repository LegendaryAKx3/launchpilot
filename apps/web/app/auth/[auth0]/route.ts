import { handleAuth } from "@auth0/nextjs-auth0";
import { NextResponse } from "next/server";

import { getAuth0ConfigError, isAuthEnabled } from "@/lib/auth0";

const authHandler = handleAuth();

export async function GET(request: Request, context: { params: Promise<{ auth0: string }> }) {
  if (!isAuthEnabled()) {
    return NextResponse.json(
      {
        error: "AUTH0_CONFIG_MISSING",
        message: getAuth0ConfigError(),
        hint: "Set Auth0 web env vars in apps/web/.env.local, then restart Next.js."
      },
      { status: 500 }
    );
  }
  return authHandler(request, context);
}

export async function POST(request: Request, context: { params: Promise<{ auth0: string }> }) {
  if (!isAuthEnabled()) {
    return NextResponse.json(
      {
        error: "AUTH0_CONFIG_MISSING",
        message: getAuth0ConfigError(),
        hint: "Set Auth0 web env vars in apps/web/.env.local, then restart Next.js."
      },
      { status: 500 }
    );
  }
  return authHandler(request, context);
}
