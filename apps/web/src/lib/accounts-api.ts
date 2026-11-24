import { API, ApiError } from "./api";

interface ReqOptions {
  method?: string;
  body?: unknown;
  token?: string;
  /** Send the httpOnly refresh cookie. Needed for sign-in, refresh and sign-out. */
  cookies?: boolean;
}

/** One small fetch wrapper for every account call. Throws ApiError with the server's code. */
async function req<T>(path: string, o: ReqOptions = {}): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    method: o.method ?? (o.body === undefined ? "GET" : "POST"),
    credentials: o.cookies ? "include" : "same-origin",
    headers: {
      ...(o.body !== undefined ? { "Content-Type": "application/json" } : {}),
      ...(o.token ? { Authorization: `Bearer ${o.token}` } : {}),
    },
    body: o.body === undefined ? undefined : JSON.stringify(o.body),
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
      json.error?.message ?? "Something went wrong",
    );
  }
  return json.data;
}

// ---------- Customers ----------

export interface Profile {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  emailVerified: boolean;
}

export interface CustomerSession {
  accessToken: string;
  profile: Profile;
}

export const accountSignup = (b: {
  name: string;
  email: string;
  password: string;
  phone?: string;
}) => req<CustomerSession>("/account/signup", { body: b, cookies: true });
export const accountLogin = (email: string, password: string) =>
  req<CustomerSession>("/account/login", { body: { email, password }, cookies: true });
export const accountRefresh = () =>
  req<CustomerSession>("/account/refresh", { method: "POST", cookies: true });
export const accountLogout = () => req<void>("/account/logout", { method: "POST", cookies: true });
export const accountUpdate = (token: string, b: { name?: string; phone?: string | null }) =>
  req<Profile>("/account/me", { method: "PATCH", body: b, token });
export const accountPassword = (
  token: string,
  b: { currentPassword: string; newPassword: string },
) => req<{ accessToken: string }>("/account/password", { body: b, token, cookies: true });
export const accountDelete = (token: string, password: string) =>
  req<void>("/account/me", { method: "DELETE", body: { password }, token, cookies: true });
export const accountResend = (token: string) =>
  req<{ message: string }>("/account/resend-verification", { method: "POST", token });
export const accountVerify = (token: string) =>
  req<void>("/account/verify-email", { body: { token } });

export interface OrderRow {
  orderNumber: string;
  status: string;
  trackingUrl: string | null;
  items: Array<{ title: string; size: string; quantity: number }>;
}
export const accountOrders = (token: string) => req<OrderRow[]>("/account/orders", { token });

// ---------- Recovery (both kinds of account) ----------

export const authForgot = (type: "customer" | "staff", email: string) =>
  req<{ message: string }>("/auth/forgot", { body: { type, email } });
export const authReset = (type: "customer" | "staff", token: string, password: string) =>
  req<void>("/auth/reset", { body: { type, token, password } });

// ---------- Staff ----------

export interface StaffSession {
  accessToken: string;
  role: "admin" | "support";
  name: string;
  email?: string;
}

export const staffLogin = (email: string, password: string) =>
  req<StaffSession>("/admin/login", { body: { email, password }, cookies: true });
export const staffRefresh = () =>
  req<StaffSession>("/admin/refresh", { method: "POST", cookies: true });
export const staffLogout = () => req<void>("/admin/logout", { method: "POST", cookies: true });
export const staffInviteInfo = (token: string) =>
  req<{ email: string; role: "admin" | "support" }>("/admin/invite-info", { body: { token } });
export const staffAcceptInvite = (b: { token: string; name: string; password: string }) =>
  req<StaffSession>("/admin/accept-invite", { body: b, cookies: true });

export interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: "admin" | "support";
}
export interface InviteRow {
  id: string;
  email: string;
  role: "admin" | "support";
  expiresAt: string;
}
export const staffTeam = (token: string) => req<TeamMember[]>("/admin/team", { token });
export const staffInvites = (token: string) => req<InviteRow[]>("/admin/invites", { token });
export const staffInvite = (token: string, b: { email: string; role: "admin" | "support" }) =>
  req<{ id: string }>("/admin/invites", { body: b, token });
export const staffRevokeInvite = (token: string, id: string) =>
  req<void>(`/admin/invites/${id}`, { method: "DELETE", token });
