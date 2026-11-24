"use client";

import { useCallback, useEffect, useState } from "react";
import {
  type InviteRow,
  type TeamMember,
  staffInvite,
  staffInvites,
  staffRevokeInvite,
  staffTeam,
} from "@/lib/accounts-api";
import { ApiError } from "@/lib/api";
import { FormMessage } from "../auth/AuthShell";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";

/**
 * Staff accounts are created by invitation: an admin enters an email and a role, and the person
 * gets a one-time link (valid 7 days) to set their own password. Nobody can sign up on their own.
 */
export function TeamTab({ token }: { token: string }) {
  const [team, setTeam] = useState<TeamMember[]>([]);
  const [invites, setInvites] = useState<InviteRow[]>([]);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"admin" | "support">("support");
  const [msg, setMsg] = useState<{ kind: "error" | "note"; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const [t, i] = await Promise.all([staffTeam(token), staffInvites(token)]);
      setTeam(t);
      setInvites(i);
    } catch {
      setMsg({ kind: "error", text: "Could not load the team." });
    }
  }, [token]);

  useEffect(() => {
    void load();
  }, [load]);

  async function invite(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    try {
      await staffInvite(token, { email, role });
      setEmail("");
      setMsg({ kind: "note", text: `Invitation sent to ${email}. The link works for 7 days.` });
      await load();
    } catch (err) {
      setMsg({
        kind: "error",
        text:
          err instanceof ApiError && err.code === "ALREADY_STAFF"
            ? "That person already has a staff account."
            : "Could not send the invitation. Check the email address.",
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-12">
      <section aria-labelledby="invite-h" className="max-w-xl">
        <h2 id="invite-h" className="text-2xl">
          Invite someone
        </h2>
        <p className="mt-2 text-sm text-muted">
          They get an email with a one-time link to set their own password. Support can handle
          exchanges and reviews; admins can also manage the team, charts and waitlist.
        </p>
        <form onSubmit={invite} className="mt-5 grid gap-4">
          <Input
            id="inv-email"
            label="Their email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <div className="flex flex-col gap-1.5">
            <label htmlFor="inv-role" className="text-sm font-medium">
              Role
            </label>
            <select
              id="inv-role"
              value={role}
              onChange={(e) => setRole(e.target.value as "admin" | "support")}
              className="min-h-12 border border-line bg-card px-3.5"
            >
              <option value="support">Support</option>
              <option value="admin">Admin</option>
            </select>
          </div>
          <FormMessage kind={msg?.kind ?? "note"}>{msg?.text}</FormMessage>
          <Button type="submit" className="w-fit" disabled={busy}>
            {busy ? "Sending…" : "Send invitation"}
          </Button>
        </form>
      </section>

      <section aria-labelledby="pending-h">
        <h2 id="pending-h" className="text-2xl">
          Waiting to join ({invites.length})
        </h2>
        {invites.length === 0 ? (
          <p className="mt-3 text-sm text-muted">No open invitations.</p>
        ) : (
          <ul className="mt-4 divide-y divide-line border-y border-line">
            {invites.map((i) => (
              <li
                key={i.id}
                className="flex flex-wrap items-center justify-between gap-3 py-3 text-sm"
              >
                <span>
                  {i.email}{" "}
                  <span className="text-muted">
                    ({i.role}, expires {new Date(i.expiresAt).toLocaleDateString("en-IN")})
                  </span>
                </span>
                <button
                  className="link min-h-11"
                  onClick={() => staffRevokeInvite(token, i.id).then(load)}
                >
                  Cancel<span className="sr-only"> invitation for {i.email}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="team-h">
        <h2 id="team-h" className="text-2xl">
          The team ({team.length})
        </h2>
        <ul className="mt-4 divide-y divide-line border-y border-line">
          {team.map((m) => (
            <li
              key={m.id}
              className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm"
            >
              <span>
                {m.name || "(no name yet)"} <span className="text-muted">{m.email}</span>
              </span>
              <span className="text-xs font-semibold uppercase tracking-wider">{m.role}</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
