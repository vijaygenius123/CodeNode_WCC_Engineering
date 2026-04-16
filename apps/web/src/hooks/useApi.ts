import { useCallback, useEffect, useRef, useState } from "react";
import { useRole } from "../context/RoleContext";

// In dev, Vite proxies /api/* → http://localhost:3001.
// In prod, set VITE_API_URL to the backend origin.
const BASE_URL = import.meta.env.VITE_API_URL ?? "";

export function useApi<T>(endpoint: string | null) {
  const { role } = useRole();
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const doFetch = useCallback(async () => {
    if (!endpoint) return;

    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;

    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`${BASE_URL}${endpoint}`, {
        headers: { "X-CaseView-Role": role },
        signal: ctrl.signal,
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as {
          error?: string;
        };
        throw new Error(body.error ?? `${res.status} ${res.statusText}`);
      }
      const json = (await res.json()) as T;
      setData(json);
    } catch (e) {
      if (e instanceof Error && e.name !== "AbortError") {
        setError(e.message);
      }
    } finally {
      setLoading(false);
    }
  }, [endpoint, role]);

  useEffect(() => {
    void doFetch();
    return () => {
      abortRef.current?.abort();
    };
  }, [doFetch]);

  return { data, loading, error, refetch: doFetch };
}

export async function postMessage(
  caseId: string,
  message: string,
  role: string
): Promise<{ role: string; content: string }> {
  const res = await fetch(`${BASE_URL}/api/cases/${caseId}/chat`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-CaseView-Role": role,
    },
    body: JSON.stringify({ message }),
  });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  return res.json() as Promise<{ role: string; content: string }>;
}
