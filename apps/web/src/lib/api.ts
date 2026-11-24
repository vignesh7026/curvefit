import type { SizeChart, SizeRecommendation } from "@curvefit/shared";

export const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api";

export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
  ) {
    super(message);
  }
}

interface CallOptions extends RequestInit {
  token?: string;
}

async function call<T>(path: string, init: CallOptions = {}): Promise<T> {
  const { token, ...rest } = init;
  const res = await fetch(`${API}${path}`, {
    ...rest,
    headers: {
      ...(rest.body ? { "Content-Type": "application/json" } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...rest.headers,
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

const post = <T>(path: string, body: unknown, init: CallOptions = {}) =>
  call<T>(path, { method: "POST", body: JSON.stringify(body), ...init });

// ---------- Customer ----------

export interface SizeAnswer extends SizeRecommendation {
  chart: SizeChart;
  deleteToken?: string;
}

export const requestSize = (body: {
  productId: string;
  measurements: { heightCm: number; bustCm: number; waistCm: number; hipCm: number };
  consentToStore: boolean;
}) => post<SizeAnswer>("/size", body);

export const getChart = (productId: string) =>
  call<SizeChart>(`/size/${encodeURIComponent(productId)}`);

export const deleteSizeLog = (token: string) =>
  call<void>(`/size/logs/${token}`, { method: "DELETE" });

export interface ReviewView {
  _id: string;
  rating: number;
  sizeWorn: string;
  heightCm: number;
  hipCm: number;
  fit: "runs_small" | "true_to_size" | "runs_large";
  body: string;
  verifiedPurchase: boolean;
  photoUrls?: string[];
}

export const getReviews = (
  productId: string,
  filters: { size?: string; fit?: string; heightCm?: number; hipCm?: number } = {},
) => {
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries(filters))
    if (v !== undefined && v !== "") q.set(k, String(v));
  const qs = q.toString();
  return call<ReviewView[]>(`/reviews/${encodeURIComponent(productId)}${qs ? `?${qs}` : ""}`);
};

export const submitReview = (body: {
  productId: string;
  rating: number;
  sizeWorn: string;
  heightCm: number;
  hipCm: number;
  fit: string;
  body: string;
  photoUrls?: string[];
}) => post<{ id: string; status: string }>("/reviews", body);

export const requestExchangeOtp = (body: { orderNumber: string; phone: string }) =>
  post<{ message: string }>("/exchange/otp", body);

export interface ExchangeResult {
  id: string;
  status: string;
  replacementOrder: string | null;
  courierReference: string | null;
}

export const submitExchange = (body: {
  kind: "exchange" | "return";
  orderNumber: string;
  phone: string;
  otp: string;
  item: string;
  fromSize: string;
  toSize?: string;
  reason?: string;
  sizeFinderUsed: boolean;
}) => post<ExchangeResult>("/exchange", body);

export interface TrackedOrder {
  orderNumber: string;
  status: string;
  trackingUrl: string | null;
  items: Array<{ title: string; size: string; quantity: number }>;
}

export const trackOrder = (body: { orderNumber: string; phone: string }) =>
  post<TrackedOrder>("/orders/track", body);

export const joinWaitlist = (body: {
  email?: string;
  phone?: string;
  interestedSizes: string[];
  referredBy?: string;
  consent: true;
}) => post<{ referralCode: string }>("/waitlist", body);

export const createRestockAlert = (body: {
  productId: string;
  size: string;
  email?: string;
  phone?: string;
  consent: true;
}) => post<{ message: string }>("/restock-alerts", body);

// ---------- Staff ----------

export interface Stats {
  exchanges: {
    total: number;
    byStatus: Record<string, number>;
    byKind: Record<string, number>;
    withSizeFinder: number;
    withoutSizeFinder: number;
  };
  reviewsPending: number;
  savedSizeRecords: number;
  waitlist: { total: number; referred: number };
}

export interface ExchangeRow {
  _id: string;
  kind: "exchange" | "return";
  orderNumber: string;
  item: string;
  fromSize: string;
  toSize: string | null;
  status: string;
  courierReference: string | null;
  replacementOrder: string | null;
  createdAt: string;
}

export interface WaitlistRow {
  _id: string;
  email?: string;
  phone?: string;
  referralCode: string;
  referrals: number;
}

const credentials: RequestInit = { credentials: "include" };

export const adminLogin = (email: string, password: string) =>
  post<{ accessToken: string; role: string }>("/admin/login", { email, password }, credentials);
export const adminRefresh = () =>
  post<{ accessToken: string; role: string }>("/admin/refresh", undefined, credentials);
export const adminLogout = () => call<void>("/admin/logout", { method: "POST", ...credentials });

export const adminStats = (token: string) => call<Stats>("/admin/stats", { token });
export const adminExchanges = (token: string) => call<ExchangeRow[]>("/admin/exchanges", { token });
export const adminSetExchangeStatus = (token: string, id: string, status: string) =>
  call<void>(`/admin/exchanges/${id}`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
    token,
  });
export const adminBookPickup = (token: string, id: string) =>
  call<{ courierReference: string }>(`/admin/exchanges/${id}/book-pickup`, {
    method: "POST",
    token,
  });
export const adminReviews = (token: string, status = "pending") =>
  call<Array<ReviewView & { productId: string; status: string }>>(
    `/admin/reviews?status=${status}`,
    { token },
  );
export const adminModerateReview = (token: string, id: string, status: "approved" | "rejected") =>
  call<void>(`/admin/reviews/${id}`, { method: "PATCH", body: JSON.stringify({ status }), token });
export const adminWaitlist = (token: string) => call<WaitlistRow[]>("/admin/waitlist", { token });
export const adminNotifyRestock = (
  token: string,
  body: { productId: string; size: string; productUrl: string },
) =>
  call<{ notified: number }>("/admin/restock/notify", {
    method: "POST",
    body: JSON.stringify(body),
    token,
  });
export const adminSaveChart = (token: string, chart: SizeChart) =>
  call<void>("/admin/size-charts", { method: "PUT", body: JSON.stringify(chart), token });
