export type User = {
  id: string;
  handle: string;
  name: string;
  avatar: string;
  photo?: string | null;
  status: string;
};

let cachedToken: string | null =
  typeof window !== "undefined"
    ? localStorage.getItem("nexo_session")
    : null;

export function setSessionToken(token: string | null) {
  cachedToken = token;
  if (typeof window !== "undefined") {
    if (token) localStorage.setItem("nexo_session", token);
    else localStorage.removeItem("nexo_session");
  }
}

export function getSessionToken() {
  if (!cachedToken && typeof window !== "undefined") {
    cachedToken = localStorage.getItem("nexo_session");
  }
  return cachedToken;
}

export async function api<T = any>(
  url: string,
  method = "GET",
  data?: unknown,
): Promise<T> {
  const token = getSessionToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const r = await fetch("/api" + url, {
    method,
    headers,
    credentials: "include",
    body: data === undefined ? undefined : JSON.stringify(data),
  });

  const sessionHeader = r.headers.get("X-Session-Token");
  if (sessionHeader) {
    setSessionToken(sessionHeader);
  }

  if (url === "/logout" && r.ok) {
    setSessionToken(null);
  }

  const result = await r
    .json()
    .catch(() => ({ error: "Operação indisponível" }));
  if (!r.ok) throw Error(result.error || "Operação indisponível");

  if (result && typeof result === "object" && (result as any).token) {
    setSessionToken((result as any).token);
  }

  return result;
}
