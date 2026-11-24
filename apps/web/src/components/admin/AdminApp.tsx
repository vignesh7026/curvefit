"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import {
  type ExchangeRow,
  type Stats,
  type WaitlistRow,
  adminBookPickup,
  adminExchanges,
  adminModerateReview,
  adminNotifyRestock,
  adminReviews,
  adminSaveChart,
  adminSetExchangeStatus,
  adminStats,
  adminWaitlist,
  getChart,
} from "@/lib/api";
import { useStaff } from "@/lib/staff-session";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";
import { FitSessions } from "./FitSessions";
import { TeamTab } from "./TeamTab";

type Tab = "overview" | "exchanges" | "reviews" | "fittings" | "waitlist" | "tools" | "team";
type Review = Awaited<ReturnType<typeof adminReviews>>[number];

const STATUSES = ["requested", "pickup_booked", "received", "replacement_shipped", "cancelled"];

export function AdminApp() {
  const router = useRouter();
  const { status, token, role, name, logout } = useStaff();

  // Not signed in: go to the sign-in page. The session is restored from the httpOnly cookie.
  useEffect(() => {
    if (status === "out") router.replace("/admin/login");
  }, [status, router]);

  if (status !== "in" || !token || !role) return <p role="status">Loading…</p>;
  return (
    <Dashboard
      token={token}
      role={role}
      name={name}
      onLogout={async () => {
        await logout();
        router.push("/admin/login");
      }}
    />
  );
}

function Dashboard({
  token,
  role,
  name,
  onLogout,
}: {
  token: string;
  role: string;
  name: string;
  onLogout: () => void;
}) {
  const [tab, setTab] = useState<Tab>("overview");
  const isAdmin = role === "admin";
  const tabs: Tab[] = isAdmin
    ? ["overview", "exchanges", "reviews", "fittings", "waitlist", "team", "tools"]
    : ["overview", "exchanges", "reviews", "fittings"];

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-4xl">Team dashboard</h1>
        <div className="flex items-center gap-3 text-sm">
          <span>
            {name ? name + ", " : ""}signed in as {role}
          </span>
          <Button variant="secondary" onClick={onLogout}>
            Sign out
          </Button>
        </div>
      </div>
      <div role="tablist" aria-label="Admin sections" className="mb-8 flex flex-wrap gap-2">
        {tabs.map((t) => (
          <button
            key={t}
            role="tab"
            aria-selected={tab === t}
            onClick={() => setTab(t)}
            className={`min-h-11 px-4 text-sm font-medium capitalize ${tab === t ? "bg-ink text-bone" : "border border-line bg-card hover:border-ink"}`}
          >
            {t}
          </button>
        ))}
      </div>
      <div role="tabpanel">
        {tab === "overview" ? <Overview token={token} /> : null}
        {tab === "exchanges" ? <Exchanges token={token} /> : null}
        {tab === "reviews" ? <Reviews token={token} canModerate={isAdmin} /> : null}
        {tab === "waitlist" ? <Waitlist token={token} /> : null}
        {tab === "fittings" ? <FitSessions token={token} canDelete={isAdmin} /> : null}
        {tab === "team" ? <TeamTab token={token} /> : null}
        {tab === "tools" ? <Tools token={token} /> : null}
      </div>
    </div>
  );
}

/** Loads data once and exposes a reload; keeps each tab small. */
function useLoad<T>(fn: () => Promise<T>) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const reload = useCallback(() => {
    fn()
      .then((d) => {
        setData(d);
        setError(null);
      })
      .catch(() => setError("Could not load this section."));
  }, []);
  useEffect(reload, [reload]);
  return { data, error, reload };
}

const pct = (n: number, d: number) => (d === 0 ? "n/a" : `${Math.round((n / d) * 100)}%`);

function Overview({ token }: { token: string }) {
  const { data, error } = useLoad<Stats>(() => adminStats(token));
  if (error) return <p role="alert">{error}</p>;
  if (!data) return <p role="status">Loading…</p>;
  const e = data.exchanges;
  const cards: Array<[string, string | number]> = [
    ["Exchange and return requests", e.total],
    ["From size-finder users", e.withSizeFinder],
    ["From non-users", e.withoutSizeFinder],
    ["Reviews awaiting moderation", data.reviewsPending],
    ["Saved size records", data.savedSizeRecords],
    ["Waitlist", data.waitlist.total],
    [
      "Joined by referral",
      `${data.waitlist.referred} (${pct(data.waitlist.referred, data.waitlist.total)})`,
    ],
  ];
  return (
    <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
      {cards.map(([label, value]) => (
        <div key={label} className="rounded-sm border border-line bg-card p-4">
          <p className="text-2xl">{value}</p>
          <p className="text-sm text-muted">{label}</p>
        </div>
      ))}
      <p className="text-xs text-muted sm:col-span-2 md:col-span-3">
        Compare exchange counts with orders from Shopify to get the exchange rate for size-finder
        users against everyone else.
      </p>
    </div>
  );
}

function Exchanges({ token }: { token: string }) {
  const { data, error, reload } = useLoad<ExchangeRow[]>(() => adminExchanges(token));
  const [msg, setMsg] = useState<string | null>(null);

  async function act(fn: () => Promise<unknown>, ok: string) {
    setMsg(null);
    try {
      await fn();
      setMsg(ok);
      reload();
    } catch {
      setMsg("That did not work. Please try again.");
    }
  }

  if (error) return <p role="alert">{error}</p>;
  if (!data) return <p role="status">Loading…</p>;
  if (data.length === 0) return <p>No requests yet.</p>;
  return (
    <div>
      <div role="status" aria-live="polite" className="mb-2 text-sm">
        {msg}
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[40rem] text-left text-sm">
          <caption className="sr-only">Exchange and return requests</caption>
          <thead>
            <tr className="border-b border-line">
              {["Order", "Type", "Item", "Sizes", "Status", "Pickup", ""].map((h) => (
                <th key={h} scope="col" className="py-2 pr-3">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((r) => (
              <tr key={r._id} className="border-b border-line align-top">
                <td className="py-2 pr-3">#{r.orderNumber}</td>
                <td className="py-2 pr-3">{r.kind}</td>
                <td className="py-2 pr-3">{r.item}</td>
                <td className="py-2 pr-3">
                  {r.fromSize}
                  {r.toSize ? ` → ${r.toSize}` : ""}
                </td>
                <td className="py-2 pr-3">
                  <label className="sr-only" htmlFor={`st-${r._id}`}>
                    Status for order {r.orderNumber}
                  </label>
                  <select
                    id={`st-${r._id}`}
                    value={r.status}
                    onChange={(e) =>
                      act(
                        () => adminSetExchangeStatus(token, r._id, e.target.value),
                        "Status updated.",
                      )
                    }
                    className="min-h-11 rounded-sm border border-line bg-card px-2"
                  >
                    {STATUSES.map((s) => (
                      <option key={s}>{s}</option>
                    ))}
                  </select>
                </td>
                <td className="py-2 pr-3">
                  {r.courierReference ?? (
                    <Button
                      variant="secondary"
                      onClick={() => act(() => adminBookPickup(token, r._id), "Pickup booked.")}
                    >
                      Book pickup
                    </Button>
                  )}
                </td>
                <td className="py-2 text-xs text-muted">
                  {r.replacementOrder ? `Replacement ${r.replacementOrder}` : ""}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Reviews({ token, canModerate }: { token: string; canModerate: boolean }) {
  const { data, error, reload } = useLoad<Review[]>(() => adminReviews(token, "pending"));
  if (error) return <p role="alert">{error}</p>;
  if (!data) return <p role="status">Loading…</p>;
  if (data.length === 0) return <p>No reviews are waiting.</p>;
  return (
    <ul className="flex flex-col gap-3">
      {data.map((r) => (
        <li key={r._id} className="rounded-sm border border-line bg-card p-4 text-sm">
          <p className="font-semibold">
            {r.productId}: {r.rating}/5, size {r.sizeWorn}, {r.heightCm} cm, hip {r.hipCm} cm,{" "}
            {r.fit.replaceAll("_", " ")}
          </p>
          <p className="mt-1">{r.body || "(no text)"}</p>
          {r.photoUrls && r.photoUrls.length > 0 ? (
            <ul className="mt-2 flex flex-wrap gap-2">
              {r.photoUrls.map((u, i) => (
                <li key={u}>
                  <a href={u} target="_blank" rel="noopener noreferrer">
                    <img
                      src={u}
                      alt={`Review photo ${i + 1}, opens full size`}
                      width={80}
                      height={80}
                      className="size-20 rounded-sm object-cover"
                    />
                  </a>
                </li>
              ))}
            </ul>
          ) : null}
          {canModerate ? (
            <div className="mt-3 flex gap-2">
              <Button onClick={() => adminModerateReview(token, r._id, "approved").then(reload)}>
                Approve
              </Button>
              <Button
                variant="secondary"
                onClick={() => adminModerateReview(token, r._id, "rejected").then(reload)}
              >
                Reject
              </Button>
            </div>
          ) : (
            <p className="mt-2 text-xs text-muted">Only admins can moderate.</p>
          )}
        </li>
      ))}
    </ul>
  );
}

function Waitlist({ token }: { token: string }) {
  const { data, error } = useLoad<WaitlistRow[]>(() => adminWaitlist(token));
  if (error) return <p role="alert">{error}</p>;
  if (!data) return <p role="status">Loading…</p>;
  if (data.length === 0) return <p>Nobody has joined yet.</p>;
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-96 text-left text-sm">
        <caption className="sr-only">Waitlist, most referrals first</caption>
        <thead>
          <tr className="border-b border-line">
            <th scope="col" className="py-2 pr-3">
              Contact
            </th>
            <th scope="col" className="py-2 pr-3">
              Code
            </th>
            <th scope="col" className="py-2 pr-3">
              Referrals
            </th>
          </tr>
        </thead>
        <tbody>
          {data.map((w) => (
            <tr key={w._id} className="border-b border-line">
              <td className="py-2 pr-3">{w.email ?? w.phone}</td>
              <td className="py-2 pr-3 font-mono">{w.referralCode}</td>
              <td className="py-2 pr-3">{w.referrals}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Tools({ token }: { token: string }) {
  const [restock, setRestock] = useState({ productId: "", size: "", productUrl: "" });
  const [chartId, setChartId] = useState("");
  const [chartJson, setChartJson] = useState("");
  const [msg, setMsg] = useState<string | null>(null);

  async function sendRestock(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    try {
      const r = await adminNotifyRestock(token, restock);
      setMsg(`Notified ${r.notified} ${r.notified === 1 ? "person" : "people"}.`);
    } catch {
      setMsg("Could not send restock alerts. Check the product id, size and URL.");
    }
  }

  async function loadChart() {
    setMsg(null);
    try {
      setChartJson(JSON.stringify(await getChart(chartId), null, 2));
    } catch {
      setMsg("No chart found for that product id.");
    }
  }

  async function saveChart() {
    setMsg(null);
    try {
      await adminSaveChart(token, JSON.parse(chartJson));
      setMsg("Size chart saved.");
    } catch {
      setMsg(
        "The chart was rejected. Bands must be ordered smallest to largest with valid ranges.",
      );
    }
  }

  return (
    <div className="flex flex-col gap-8">
      <div role="status" aria-live="polite" className="text-sm">
        {msg}
      </div>
      <form onSubmit={sendRestock} className="flex max-w-md flex-col gap-3">
        <h2 className="text-xl font-semibold">Send restock alerts</h2>
        <Input
          id="r-pid"
          label="Product handle"
          required
          value={restock.productId}
          onChange={(e) => setRestock({ ...restock, productId: e.target.value })}
        />
        <Input
          id="r-size"
          label="Size"
          required
          value={restock.size}
          onChange={(e) => setRestock({ ...restock, size: e.target.value })}
        />
        <Input
          id="r-url"
          label="Product URL"
          type="url"
          required
          value={restock.productUrl}
          onChange={(e) => setRestock({ ...restock, productUrl: e.target.value })}
        />
        <Button type="submit">Notify waiting customers</Button>
      </form>

      <div className="flex max-w-2xl flex-col gap-3">
        <h2 className="text-xl font-semibold">Edit a size chart</h2>
        <p className="text-sm text-muted">
          Load a chart, change the centimetre ranges and save. The finder uses the saved chart
          straight away.
        </p>
        <div className="flex items-end gap-3">
          <div className="flex-1">
            <Input
              id="c-id"
              label="Product handle"
              value={chartId}
              onChange={(e) => setChartId(e.target.value)}
            />
          </div>
          <Button variant="secondary" onClick={loadChart} disabled={!chartId}>
            Load
          </Button>
        </div>
        <label htmlFor="c-json" className="text-sm font-medium">
          Chart (JSON)
        </label>
        <textarea
          id="c-json"
          rows={14}
          value={chartJson}
          onChange={(e) => setChartJson(e.target.value)}
          className="rounded-sm border border-line bg-card p-3 font-mono text-xs"
        />
        <Button onClick={saveChart} disabled={!chartJson}>
          Save chart
        </Button>
      </div>
    </div>
  );
}
