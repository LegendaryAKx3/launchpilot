import { Auth0Client } from "@auth0/nextjs-auth0/server";

function readAuth0Config() {
  const domain =
    process.env.AUTH0_DOMAIN ??
    process.env.AUTH0_ISSUER_BASE_URL?.replace(/^https?:\/\//, "").replace(/\/$/, "");
  const clientId = process.env.AUTH0_CLIENT_ID;
  const clientSecret = process.env.AUTH0_CLIENT_SECRET;
  const secret = process.env.AUTH0_SECRET;
  const appBaseUrl =
    process.env.APP_BASE_URL ??
    process.env.AUTH0_BASE_URL ??
    process.env.NEXT_PUBLIC_APP_URL;

  if (!domain || !clientId || !clientSecret || !secret || !appBaseUrl) {
    throw new Error(
      "Missing Auth0 web config. Required: AUTH0_DOMAIN (or AUTH0_ISSUER_BASE_URL), AUTH0_CLIENT_ID, AUTH0_CLIENT_SECRET, AUTH0_SECRET, APP_BASE_URL (or AUTH0_BASE_URL/NEXT_PUBLIC_APP_URL)."
    );
  }

  return {
    domain,
    clientId,
    clientSecret,
    secret,
    appBaseUrl,
    authorizationParameters: {
      audience: process.env.AUTH0_AUDIENCE,
      scope: process.env.AUTH0_SCOPE ?? "openid profile email offline_access"
    }
  };
}

export function getAuth0ConfigError(): string | null {
  try {
    readAuth0Config();
    return null;
  } catch (error) {
    return error instanceof Error ? error.message : "Unknown Auth0 configuration error.";
  }
}

export function isAuthEnabled(): boolean {
  return getAuth0ConfigError() === null;
}

export const auth0 = isAuthEnabled() ? new Auth0Client(readAuth0Config()) : null;
