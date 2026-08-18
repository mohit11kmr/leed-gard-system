const AUTH_KEY = "leadguard:auth";

export interface StoredAuth {
  token?: string;
  apiKey?: string;
  guest?: boolean;
}

export function getStoredAuth(): StoredAuth | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(AUTH_KEY);
    return raw ? (JSON.parse(raw) as StoredAuth) : null;
  } catch {
    return null;
  }
}

export function setStoredAuth(auth: StoredAuth) {
  if (typeof window !== "undefined") {
    window.localStorage.setItem(AUTH_KEY, JSON.stringify(auth));
  }
}

export async function ensureGuestAuth(): Promise<StoredAuth> {
  const existing = getStoredAuth();
  if (existing?.apiKey) return existing;

  const res = await fetch("/api/auth/guest", { method: "POST" });
  if (!res.ok) {
    throw new Error("Unable to initialize guest session.");
  }
  const data = await res.json();
  const auth: StoredAuth = { token: data.token, apiKey: data.apiKey, guest: true };
  setStoredAuth(auth);
  return auth;
}

export async function authedFetch(
  path: string,
  options: RequestInit = {}
): Promise<Response> {
  const auth = await ensureGuestAuth();
  const headers = new Headers(options.headers || {});
  headers.set("Content-Type", "application/json");
  if (auth.apiKey) {
    headers.set("x-api-key", auth.apiKey);
  } else if (auth.token) {
    headers.set("Authorization", `Bearer ${auth.token}`);
  }
  return fetch(path, { ...options, headers });
}