import { createHash, randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";
import type { SignupInput } from "@curvefit/shared";
import type { Env } from "../config/env";
import {
  type Audience,
  type Role,
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
} from "../middleware/auth";
import { AdminUserModel } from "../models/AdminUser";
import { AuthTokenModel } from "../models/AuthToken";
import { CustomerUserModel } from "../models/CustomerUser";
import { HttpError, badRequest, forbidden, notFound, unauthorized } from "../utils/httpError";
import type { Notifier } from "./notifier";
import type { ShopifyService } from "./shopifyService";
import type { TrackedOrder } from "./orderService";

const sha = (v: string) => createHash("sha256").update(v).digest("hex");
const newToken = () => randomBytes(32).toString("hex");
const HOUR = 3600_000;
const TTL = { verify: 48 * HOUR, reset: 1 * HOUR, invite: 7 * 24 * HOUR } as const;

// A throwaway hash, compared against when the email is unknown, so timing does not give it away.
const DUMMY_HASH = bcrypt.hashSync("not-a-real-password", 10);

/** Passwords everyone tries first. Length is the main rule; this just stops the worst. */
const COMMON = new Set(
  [
    "password12",
    "password123",
    "1234567890",
    "12345678910",
    "qwertyuiop",
    "iloveyou123",
    "welcome123",
    "admin12345",
    "letmein1234",
    "password1234",
  ].map((p) => p.toLowerCase()),
);

export function checkPassword(password: string, email: string) {
  const lower = password.toLowerCase();
  if (COMMON.has(lower) || /^(.)\1+$/.test(password)) {
    throw badRequest("Please choose a less common password", "WEAK_PASSWORD");
  }
  const local = email.split("@")[0]?.toLowerCase() ?? "";
  if (lower === email.toLowerCase() || (local.length >= 4 && lower.includes(local))) {
    throw badRequest("Your password should not contain your email", "WEAK_PASSWORD");
  }
}

export interface Session {
  accessToken: string;
  refreshToken: string;
}

export interface CustomerProfile {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  emailVerified: boolean;
}

export interface StaffMember {
  id: string;
  name: string;
  email: string;
  role: Role;
}

export interface InviteRow {
  id: string;
  email: string;
  role: Role;
  expiresAt: Date;
}

export interface IdentityService {
  // ----- customers
  signup(input: SignupInput): Promise<Session & { profile: CustomerProfile }>;
  customerLogin(email: string, password: string): Promise<Session & { profile: CustomerProfile }>;
  customerRefresh(refreshToken: string): Promise<Session & { profile: CustomerProfile }>;
  me(id: string): Promise<CustomerProfile>;
  updateProfile(
    id: string,
    patch: { name?: string; phone?: string | null },
  ): Promise<CustomerProfile>;
  changePassword(id: string, current: string, next: string): Promise<Session>;
  deleteAccount(id: string, password: string): Promise<void>;
  verifyEmail(token: string): Promise<void>;
  resendVerification(id: string): Promise<void>;
  orders(id: string): Promise<TrackedOrder[]>;
  // ----- shared
  forgotPassword(type: Audience, email: string): Promise<void>;
  resetPassword(type: Audience, token: string, password: string): Promise<void>;
  // ----- staff
  invite(invitedBy: string, email: string, role: Role): Promise<{ id: string }>;
  listInvites(): Promise<InviteRow[]>;
  revokeInvite(id: string): Promise<void>;
  inviteInfo(token: string): Promise<{ email: string; role: Role }>;
  acceptInvite(token: string, name: string, password: string): Promise<Session & { role: Role }>;
  team(): Promise<StaffMember[]>;
}

export function createIdentityService(
  env: Env,
  notifier: Notifier,
  shopify: ShopifyService,
): IdentityService {
  const webUrl = (env.WEB_URL || env.CORS_ORIGINS.split(",")[0] || "http://localhost:3000")
    .trim()
    .replace(/\/$/, "");

  const profileOf = (u: {
    _id: unknown;
    name: string;
    email: string;
    phone?: string | null;
    emailVerified: boolean;
  }): CustomerProfile => ({
    id: String(u._id),
    name: u.name,
    email: u.email,
    phone: u.phone ?? null,
    emailVerified: u.emailVerified,
  });

  const customerSession = (u: { _id: unknown; tokenVersion: number }): Session => ({
    accessToken: signAccessToken({ id: String(u._id), role: "customer" }, env.JWT_ACCESS_SECRET),
    refreshToken: signRefreshToken(
      { id: String(u._id), tokenVersion: u.tokenVersion },
      "customer",
      env.JWT_REFRESH_SECRET,
    ),
  });

  const staffSession = (u: { _id: unknown; role: Role; tokenVersion: number }): Session => ({
    accessToken: signAccessToken({ id: String(u._id), role: u.role }, env.JWT_ACCESS_SECRET),
    refreshToken: signRefreshToken(
      { id: String(u._id), tokenVersion: u.tokenVersion },
      "staff",
      env.JWT_REFRESH_SECRET,
    ),
  });

  async function issueToken(
    purpose: "verify" | "reset" | "invite",
    fields: {
      email: string;
      subjectType?: Audience;
      subjectId?: string;
      role?: Role;
      invitedBy?: string;
    },
  ): Promise<string> {
    const token = newToken();
    await AuthTokenModel.create({
      purpose,
      tokenHash: sha(token),
      expiresAt: new Date(Date.now() + TTL[purpose]),
      ...fields,
    });
    return token;
  }

  /** Finds an unused, unexpired token; throws one generic error for every failure. */
  async function takeToken(purpose: "verify" | "reset" | "invite", token: string) {
    const doc = await AuthTokenModel.findOne({ purpose, tokenHash: sha(token), usedAt: null });
    if (!doc || doc.expiresAt.getTime() < Date.now()) {
      throw new HttpError(400, "INVALID_TOKEN", "This link has expired or was already used");
    }
    return doc;
  }

  async function sendVerification(id: string, name: string, email: string) {
    await AuthTokenModel.deleteMany({ purpose: "verify", subjectId: id });
    const token = await issueToken("verify", { email, subjectType: "customer", subjectId: id });
    await notifier.send({ email }, "verify_email", {
      name,
      link: `${webUrl}/verify-email?token=${token}`,
    });
  }

  return {
    async signup(input) {
      const email = input.email.toLowerCase();
      checkPassword(input.password, email);
      if (await CustomerUserModel.exists({ email })) {
        throw new HttpError(409, "EMAIL_TAKEN", "An account with this email already exists");
      }
      const user = await CustomerUserModel.create({
        name: input.name,
        email,
        phone: input.phone ?? null,
        passwordHash: await bcrypt.hash(input.password, 12),
      });
      await sendVerification(String(user._id), user.name, email);
      return { ...customerSession(user), profile: profileOf(user) };
    },

    async customerLogin(email, password) {
      const user = await CustomerUserModel.findOne({ email: email.toLowerCase() });
      const ok = await bcrypt.compare(password, user?.passwordHash ?? DUMMY_HASH);
      if (!user || !ok) throw unauthorized("Invalid email or password");
      return { ...customerSession(user), profile: profileOf(user) };
    },

    async customerRefresh(refreshToken) {
      try {
        const { id, tokenVersion } = verifyRefreshToken(
          refreshToken,
          "customer",
          env.JWT_REFRESH_SECRET,
        );
        const user = await CustomerUserModel.findById(id);
        if (!user || user.tokenVersion !== tokenVersion) throw new Error("revoked");
        return { ...customerSession(user), profile: profileOf(user) };
      } catch {
        throw unauthorized("Please sign in again");
      }
    },

    async me(id) {
      const user = await CustomerUserModel.findById(id);
      if (!user) throw unauthorized();
      return profileOf(user);
    },

    async updateProfile(id, patch) {
      const user = await CustomerUserModel.findById(id);
      if (!user) throw unauthorized();
      if (patch.name !== undefined) user.name = patch.name;
      if (patch.phone !== undefined) user.phone = patch.phone;
      await user.save();
      return profileOf(user);
    },

    async changePassword(id, current, next) {
      const user = await CustomerUserModel.findById(id);
      if (!user) throw unauthorized();
      if (!(await bcrypt.compare(current, user.passwordHash))) {
        throw new HttpError(400, "WRONG_PASSWORD", "Your current password is not right");
      }
      checkPassword(next, user.email);
      user.passwordHash = await bcrypt.hash(next, 12);
      user.tokenVersion += 1; // signs out every other device
      await user.save();
      return customerSession(user);
    },

    async deleteAccount(id, password) {
      const user = await CustomerUserModel.findById(id);
      if (!user) throw unauthorized();
      if (!(await bcrypt.compare(password, user.passwordHash))) {
        throw new HttpError(400, "WRONG_PASSWORD", "Your password is not right");
      }
      await AuthTokenModel.deleteMany({ subjectId: id });
      await user.deleteOne();
    },

    async verifyEmail(token) {
      const doc = await takeToken("verify", token);
      await CustomerUserModel.updateOne({ _id: doc.subjectId }, { emailVerified: true });
      doc.usedAt = new Date();
      await doc.save();
    },

    async resendVerification(id) {
      const user = await CustomerUserModel.findById(id);
      if (!user) throw unauthorized();
      if (user.emailVerified) return;
      await sendVerification(id, user.name, user.email);
    },

    async orders(id) {
      const user = await CustomerUserModel.findById(id);
      if (!user) throw unauthorized();
      if (!user.emailVerified) {
        throw forbidden("Verify your email to see your orders");
      }
      const found = await shopify.findOrdersByEmail(user.email);
      return found.map((o) => ({
        orderNumber: o.orderNumber,
        status: o.status,
        trackingUrl: o.trackingUrl,
        items: o.items,
      }));
    },

    async forgotPassword(type, email) {
      // Always the same outcome, so this cannot be used to find out who has an account.
      const lower = email.toLowerCase();
      const user =
        type === "customer"
          ? await CustomerUserModel.findOne({ email: lower })
          : await AdminUserModel.findOne({ email: lower });
      if (!user) return;
      await AuthTokenModel.deleteMany({ purpose: "reset", subjectId: String(user._id) });
      const token = await issueToken("reset", {
        email: lower,
        subjectType: type,
        subjectId: String(user._id),
      });
      const path = type === "customer" ? "/account/reset" : "/admin/reset";
      await notifier.send({ email: lower }, "password_reset", {
        link: `${webUrl}${path}?token=${token}`,
      });
    },

    async resetPassword(type, token, password) {
      const doc = await takeToken("reset", token);
      if (doc.subjectType !== type) {
        throw new HttpError(400, "INVALID_TOKEN", "This link has expired or was already used");
      }
      checkPassword(password, doc.email);
      const hash = await bcrypt.hash(password, 12);
      const Model = (
        type === "customer" ? CustomerUserModel : AdminUserModel
      ) as typeof CustomerUserModel;
      // $inc revokes every existing session; a reset proves control of the inbox too.
      await Model.updateOne(
        { _id: doc.subjectId },
        {
          passwordHash: hash,
          $inc: { tokenVersion: 1 },
          ...(type === "customer" ? { emailVerified: true } : {}),
        },
      );
      doc.usedAt = new Date();
      await doc.save();
    },

    async invite(invitedBy, email, role) {
      const lower = email.toLowerCase();
      if (await AdminUserModel.exists({ email: lower })) {
        throw new HttpError(409, "ALREADY_STAFF", "That person already has a staff account");
      }
      await AuthTokenModel.deleteMany({ purpose: "invite", email: lower, usedAt: null });
      const token = await issueToken("invite", { email: lower, role, invitedBy });
      await notifier.send({ email: lower }, "staff_invite", {
        role,
        link: `${webUrl}/admin/signup?token=${token}`,
      });
      const doc = await AuthTokenModel.findOne({ tokenHash: sha(token) });
      return { id: String(doc?._id) };
    },

    async listInvites() {
      const docs = await AuthTokenModel.find({
        purpose: "invite",
        usedAt: null,
        expiresAt: { $gt: new Date() },
      }).sort({ createdAt: -1 });
      return docs.map((d) => ({
        id: String(d._id),
        email: d.email,
        role: d.role as Role,
        expiresAt: d.expiresAt,
      }));
    },

    async revokeInvite(id) {
      const res = await AuthTokenModel.deleteOne({ _id: id, purpose: "invite", usedAt: null });
      if (res.deletedCount === 0) throw notFound("Invitation not found");
    },

    async inviteInfo(token) {
      const doc = await takeToken("invite", token);
      return { email: doc.email, role: doc.role as Role };
    },

    async acceptInvite(token, name, password) {
      const doc = await takeToken("invite", token);
      checkPassword(password, doc.email);
      if (await AdminUserModel.exists({ email: doc.email })) {
        throw new HttpError(409, "ALREADY_STAFF", "That person already has a staff account");
      }
      const user = await AdminUserModel.create({
        name,
        email: doc.email,
        role: doc.role,
        passwordHash: await bcrypt.hash(password, 12),
      });
      doc.usedAt = new Date();
      await doc.save();
      return { ...staffSession(user), role: user.role };
    },

    async team() {
      const users = await AdminUserModel.find().sort({ createdAt: 1 });
      return users.map((u) => ({
        id: String(u._id),
        name: u.name,
        email: u.email,
        role: u.role,
      }));
    },
  };
}
