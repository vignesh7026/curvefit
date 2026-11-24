import type { FitSessionInput, SizeChart } from "@curvefit/shared";
import { API, ApiError } from "./api";

/** Uploads one review photo and returns its URL. Sends the raw image bytes. */
export async function uploadReviewPhoto(file: File): Promise<string> {
  const res = await fetch(`${API}/reviews/photos`, {
    method: "POST",
    headers: { "Content-Type": file.type },
    body: file,
  });
  const json = (await res.json().catch(() => ({}))) as {
    data?: { url: string };
    error?: { code: string; message: string };
  };
  if (!res.ok || !json.data) {
    throw new ApiError(
      res.status,
      json.error?.code ?? "UNKNOWN",
      json.error?.message ?? "Upload failed",
    );
  }
  return json.data.url;
}

/** Reports a storefront error. Fire and forget: reporting must never break the page. */
export function reportClientError(message: string, path: string, digest?: string) {
  try {
    void fetch(`${API}/client-errors`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: message.slice(0, 300), path: path.slice(0, 200), digest }),
      keepalive: true,
    }).catch(() => undefined);
  } catch {
    /* ignore */
  }
}

// ---------- Staff: fit sessions ----------

export interface FitRow extends FitSessionInput {
  _id: string;
  createdAt: string;
}

export interface FitDraft {
  sessionCount: number;
  suggestion: {
    suggestions: Array<{ label: string; goodCount: number }>;
    insufficient: Array<{ label: string; goodCount: number }>;
    warnings: string[];
    opacityFailures: number;
  };
  draftChart: SizeChart;
}

async function staffCall<T>(token: string, path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    ...init,
    headers: {
      ...(init.body ? { "Content-Type": "application/json" } : {}),
      Authorization: `Bearer ${token}`,
    },
  });
  if (res.status === 204) return undefined as T;
  const json = (await res.json().catch(() => ({}))) as {
    data?: T;
    error?: { code: string; message: string };
  };
  if (!res.ok || json.data === undefined) {
    throw new ApiError(
      res.status,
      json.error?.code ?? "UNKNOWN",
      json.error?.message ?? "Request failed",
    );
  }
  return json.data;
}

export const adminAddFit = (token: string, entry: FitSessionInput) =>
  staffCall<{ id: string }>(token, "/admin/fit-sessions", {
    method: "POST",
    body: JSON.stringify(entry),
  });
export const adminListFit = (token: string, productId: string) =>
  staffCall<FitRow[]>(token, `/admin/fit-sessions/${encodeURIComponent(productId)}`);
export const adminSuggestChart = (token: string, productId: string) =>
  staffCall<FitDraft>(token, `/admin/fit-sessions/${encodeURIComponent(productId)}/suggest`);
export const adminDeleteFit = (token: string, id: string) =>
  staffCall<void>(token, `/admin/fit-sessions/${id}`, { method: "DELETE" });
