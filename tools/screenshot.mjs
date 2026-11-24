/* eslint-env node */
import { chromium } from "@playwright/test";
const [, , url, out, w = "1500", h = "900"] = process.argv;
const b = await chromium.launch({ channel: "chrome" });
const p = await b.newPage({ viewport: { width: +w, height: +h } });
await p.goto(url, { waitUntil: "networkidle" });
await p.screenshot({ path: out, fullPage: true });
await b.close();
