import { env } from "@/lib/env";

async function getAuth0AccessToken(): Promise<string | null> {
  // /auth/access-token is provided by @auth0/nextjs-auth0 and returns
  // the current user's API access token when available.
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const response = await fetch("/auth/access-token", {
      method: "GET",
      cache: "no-store"
    });
    if (!response.ok) {
      return null;
    }

    const payload = (await response.json()) as { token?: string };
    return payload.token ?? null;
  } catch {
    return null;
  }
}

export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T | null> {
  try {
    const token = await getAuth0AccessToken();
    const headers = new Headers(init?.headers ?? {});
    if (init?.body && !(init.body instanceof FormData) && !headers.has("Content-Type")) {
      headers.set("Content-Type", "application/json");
    }
    if (token) {
      headers.set("Authorization", `Bearer ${token}`);
    }

    const response = await fetch(`${env.apiBaseUrl}${path}`, {
      ...init,
      headers,
      cache: "no-store"
    });

    if (!response.ok) {
      return null;
    }

    const payload = await response.json();
    return payload.data as T;
  } catch {
    return null;
  }
}
