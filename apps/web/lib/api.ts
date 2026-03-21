import { auth0 } from "@/lib/auth0";
import { env } from "@/lib/env";

export interface ApiErrorPayload {
  code: string;
  message: string;
}

function parseErrorPayload(payload: unknown): ApiErrorPayload | null {
  if (!payload || typeof payload !== "object") return null;
  const obj = payload as Record<string, unknown>;
  const error = obj.error;
  if (error && typeof error === "object") {
    const errObj = error as Record<string, unknown>;
    const message = typeof errObj.message === "string" ? errObj.message : null;
    const code = typeof errObj.code === "string" ? errObj.code : "REQUEST_FAILED";
    if (message) return { code, message };
  }
  const detail = obj.detail;
  if (detail && typeof detail === "object") {
    const detailObj = detail as Record<string, unknown>;
    const message = typeof detailObj.message === "string" ? detailObj.message : null;
    const code = typeof detailObj.code === "string" ? detailObj.code : "REQUEST_FAILED";
    if (message) return { code, message };
  }
  if (typeof obj.detail === "string") {
    return { code: "REQUEST_FAILED", message: obj.detail };
  }
  return null;
}

// Token cache with TTL
let _cachedToken: string | null = null;
let _tokenExpiresAt = 0;
const TOKEN_CACHE_TTL_MS = 55_000; // 55 seconds (tokens typically last 60s+)

// Client-side token fetch with caching
async function getClientAccessToken(): Promise<string | null> {
  if (typeof window === "undefined") {
    return null;
  }

  // Return cached token if still valid
  if (_cachedToken && Date.now() < _tokenExpiresAt) {
    return _cachedToken;
  }

  try {
    const response = await fetch("/auth/access-token", {
      method: "GET",
      cache: "no-store"
    });
    if (!response.ok) {
      _cachedToken = null;
      return null;
    }

    const payload = (await response.json()) as { token?: string };
    _cachedToken = payload.token ?? null;
    _tokenExpiresAt = Date.now() + TOKEN_CACHE_TTL_MS;
    return _cachedToken;
  } catch {
    _cachedToken = null;
    return null;
  }
}

// Server-side token fetch
async function getServerAccessToken(): Promise<string | null> {
  if (!auth0) {
    return null;
  }

  try {
    const tokenResponse = await auth0.getAccessToken();
    return tokenResponse?.token ?? null;
  } catch {
    return null;
  }
}

const DEFAULT_TIMEOUT_MS = 30_000;

function fetchWithTimeout(url: string, init?: RequestInit, timeoutMs = DEFAULT_TIMEOUT_MS): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  return fetch(url, {
    ...init,
    signal: controller.signal,
  }).finally(() => clearTimeout(timer));
}

// Client-side API fetch (for use in client components)
export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T | null> {
  try {
    const token = await getClientAccessToken();
    const headers = new Headers(init?.headers ?? {});
    if (init?.body && !(init.body instanceof FormData) && !headers.has("Content-Type")) {
      headers.set("Content-Type", "application/json");
    }
    if (token) {
      headers.set("Authorization", `Bearer ${token}`);
    }

    const response = await fetchWithTimeout(`${env.apiBaseUrl}${path}`, {
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

export async function apiFetchWithError<T>(
  path: string,
  init?: RequestInit
): Promise<{ data: T | null; error: ApiErrorPayload | null; status: number | null }> {
  try {
    const token = await getClientAccessToken();
    const headers = new Headers(init?.headers ?? {});
    if (init?.body && !(init.body instanceof FormData) && !headers.has("Content-Type")) {
      headers.set("Content-Type", "application/json");
    }
    if (token) {
      headers.set("Authorization", `Bearer ${token}`);
    }

    const response = await fetchWithTimeout(`${env.apiBaseUrl}${path}`, {
      ...init,
      headers,
      cache: "no-store"
    });
    const status = response.status;
    const payload = await response.json().catch(() => null);

    if (!response.ok) {
      const error = parseErrorPayload(payload);
      return { data: null, error: error ?? null, status };
    }

    return { data: (payload?.data as T | undefined) ?? null, error: null, status };
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") {
      return { data: null, error: { code: "TIMEOUT", message: "Request timed out. Please try again." }, status: null };
    }
    return { data: null, error: { code: "NETWORK_ERROR", message: "Request failed. Please try again." }, status: null };
  }
}

// Server-side API fetch (for use in server components)
export async function serverApiFetch<T>(path: string, init?: RequestInit): Promise<T | null> {
  try {
    const token = await getServerAccessToken();
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
