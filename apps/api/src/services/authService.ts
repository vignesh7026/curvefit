import bcrypt from "bcryptjs";
import type { Env } from "../config/env";
import {
  type AuthUser,
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
} from "../middleware/auth";
import { AdminUserModel } from "../models/AdminUser";
import { unauthorized } from "../utils/httpError";

export interface AuthService {
  login(
    email: string,
    password: string,
  ): Promise<{ access: string; refresh: string; user: AuthUser; name: string }>;
  refresh(
    refreshToken: string,
  ): Promise<{ access: string; role: AuthUser["role"]; name: string; email: string }>;
}

// Compared against when the email is unknown, so timing does not reveal which emails exist.
const DUMMY_HASH = bcrypt.hashSync("not-a-real-password", 10);

/** Staff sign-in. Staff accounts are created by invitation (see identityService). */
export function createAuthService(env: Env): AuthService {
  return {
    async login(email, password) {
      const doc = await AdminUserModel.findOne({ email: email.toLowerCase() });
      const ok = await bcrypt.compare(password, doc?.passwordHash ?? DUMMY_HASH);
      if (!doc || !ok) throw unauthorized("Invalid email or password");
      const user: AuthUser = { id: String(doc._id), role: doc.role };
      return {
        access: signAccessToken(user, env.JWT_ACCESS_SECRET),
        refresh: signRefreshToken(
          { id: user.id, tokenVersion: doc.tokenVersion },
          "staff",
          env.JWT_REFRESH_SECRET,
        ),
        user,
        name: doc.name,
      };
    },
    async refresh(refreshToken) {
      try {
        const { id, tokenVersion } = verifyRefreshToken(
          refreshToken,
          "staff",
          env.JWT_REFRESH_SECRET,
        );
        const doc = await AdminUserModel.findById(id);
        if (!doc || doc.tokenVersion !== tokenVersion) throw new Error("revoked");
        return {
          access: signAccessToken({ id: String(doc._id), role: doc.role }, env.JWT_ACCESS_SECRET),
          role: doc.role,
          name: doc.name,
          email: doc.email,
        };
      } catch {
        throw unauthorized("Invalid refresh token");
      }
    },
  };
}
