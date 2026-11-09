import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  CAPABILITIES,
  LIMITS,
  NXTL_LINKS,
  checkText,
  checkUrl,
  cleanUrl,
  esimCompatibilityGuidance,
  esimSetupSteps,
  explainConnectionIssue,
  explainNxtlRouting,
  explainRates,
  getResolver,
  locationPrivacySetup,
  parseBadware,
  parsePlain,
  platformSupport,
  setupBundle,
  sourceStatus,
  SNAPSHOT_MANIFEST,
  type ConnectionObservations,
  type PricingPayload,
  type Reputation,
} from "@nxtl/core";

const dataDir = join(dirname(fileURLToPath(import.meta.url)), "../../../packages/core/data");

function sha(text: string) {
  return createHash("sha256").update(text).digest("hex");
}

export function loadReputation(): Reputation {
  const badwareText = readFileSync(join(dataDir, "badware-hosts.txt"), "utf8");
  const tifText = readFileSync(join(dataDir, "tif-hosts.txt"), "utf8");
  const trackerText = readFileSync(join(dataDir, "tracker-hosts.txt"), "utf8");
  const ok =
    sha(badwareText) === SNAPSHOT_MANIFEST.sha256["badware-hosts.txt"] &&
    sha(tifText) === SNAPSHOT_MANIFEST.sha256["tif-hosts.txt"] &&
    sha(trackerText) === SNAPSHOT_MANIFEST.sha256["tracker-hosts.txt"];
  if (!ok) {
    return { badware: new Map(), tif: new Set(), trackers: new Set(), available: false, stale: true, version: SNAPSHOT_MANIFEST.version, retrieved: "2026-11-09" };
  }
  return {
    badware: parseBadware(badwareText),
    tif: parsePlain(tifText),
    trackers: parsePlain(trackerText),
    available: true,
    stale: true,
    version: SNAPSHOT_MANIFEST.version,
    retrieved: "2026-11-09",
  };
}

const reputation = loadReputation();

const ALLOWED_FETCHES = new Set<string>([NXTL_LINKS.pricingApi, NXTL_LINKS.routing]);

export async function guardedFetch(url: string, fetchImpl: typeof fetch = fetch): Promise<Response> {
  const parsed = new URL(url);
  if (parsed.protocol !== "https:" || parsed.hostname !== "nxtlsim.com" || !ALLOWED_FETCHES.has(parsed.toString())) {
    throw new Error("blocked_fetch");
  }
  return fetchImpl(url, { redirect: "manual", headers: { accept: "application/json,text/html" } });
}

export function toolCheckUrl(url: string) {
  if (url.length > LIMITS.url) return { status: "unsupported", error: "input_too_large", scope: "not parsed" };
  return { status: "ok", result: checkUrl(url, reputation), transmission: "local" as const };
}

export function toolCheckText(text: string) {
  if (text.length > LIMITS.text) return { status: "unsupported", error: "input_too_large" };
  return { status: "ok", result: checkText(text, reputation), transmission: "local" as const };
}

export function toolCleanUrl(url: string) {
  if (url.length > LIMITS.url) return { status: "unsupported", error: "input_too_large" };
  return { status: "ok", result: cleanUrl(url), transmission: "local" as const };
}

export function toolCapabilities() {
  return { status: "ok", capabilities: CAPABILITIES, transmission: "local" as const };
}

export function toolSourceStatus() {
  return { status: "ok", sources: sourceStatus(reputation.available), transmission: "local" as const };
}

export function toolPlatformSupport() {
  return { status: "ok", platforms: platformSupport(), transmission: "local" as const };
}

export function toolLocation(os: string) {
  return { status: "ok", guide: locationPrivacySetup(os || "browser"), transmission: "local" as const };
}

export function toolEsimGuidance() {
  return { status: "ok", compatibility: esimCompatibilityGuidance(), setup: esimSetupSteps(), transmission: "local" as const };
}

export async function toolRates(country: string, fetchImpl: typeof fetch = fetch) {
  if (country.length > LIMITS.country) return { status: "unsupported", error: "input_too_large" };
  try {
    const response = await guardedFetch(NXTL_LINKS.pricingApi, fetchImpl);
    if (response.status >= 300 && response.status < 400) {
      return explainRates(country, null, new Date().toISOString(), "The pricing endpoint redirected. Shield did not follow it.");
    }
    if (!response.ok) return explainRates(country, null, new Date().toISOString(), `HTTP ${response.status}`);
    const payload = (await response.json()) as PricingPayload;
    return explainRates(country, payload, new Date().toISOString());
  } catch (error) {
    const message = error instanceof Error && error.message === "blocked_fetch" ? "blocked_fetch" : "The pricing endpoint could not be read.";
    return explainRates(country, null, new Date().toISOString(), message);
  }
}

export async function toolRouting(fetchImpl: typeof fetch = fetch) {
  const bundled = explainNxtlRouting();
  try {
    const response = await guardedFetch(NXTL_LINKS.routing, fetchImpl);
    if (!response.ok) return { ...bundled, liveRecheck: "unavailable" };
    const text = await response.text();
    const phrases = text.includes("London") && text.toLowerCase().includes("internet exit");
    return { ...bundled, liveRecheck: phrases ? "phrases_still_present" : "needs_review", transmission: "nxtl" as const };
  } catch {
    return { ...bundled, liveRecheck: "unavailable" };
  }
}

export function toolConnection(observations: ConnectionObservations) {
  const notes = observations.notes ?? "";
  if (notes.length > LIMITS.notes) return { status: "unsupported", error: "input_too_large" };
  return { status: "ok", result: explainConnectionIssue({ ...observations, notes }), transmission: "local" as const };
}

export function toolDnsSteps(resolverId: string) {
  const resolver = getResolver(resolverId);
  if (!resolver) return { status: "unsupported", error: "unknown_resolver" };
  return { status: "ok", steps: setupBundle(resolverId), transmission: "local" as const };
}

export const envelope = (body: unknown) => ({
  schemaVersion: 1,
  timestamp: new Date().toISOString(),
  ...((body as object) ?? {}),
});
