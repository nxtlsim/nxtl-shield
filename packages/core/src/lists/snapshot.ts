import manifestJson from "../../data/manifest.json";

export interface ListSourceMeta {
  id: string;
  title: string;
  url: string;
  licence: string;
  licenceUrl?: string;
  attribution?: string;
  retrieved: string;
  upstreamModified?: string | null;
  expiryHint: string;
  hosts: number;
  inputsNote?: string;
}

export interface SnapshotManifest {
  version: string;
  generatedFrom: string;
  selection: Record<string, string | number>;
  sources: ListSourceMeta[];
  sha256: Record<string, string>;
}

export const SNAPSHOT_MANIFEST = manifestJson as SnapshotManifest;

export interface HostTag {
  host: string;
  tag: "all" | "doc";
}

export interface LoadedLists {
  version: string;
  badware: Map<string, "all" | "doc">;
  tif: Set<string>;
  trackers: Set<string>;
  stale: boolean;
  /** ISO time the metadata was retrieved, not a live refresh. */
  retrieved: string;
}

export interface SnapshotValidation {
  ok: boolean;
  errors: string[];
}

const HOST_RE = /^(?:[a-z0-9](?:[a-z0-9-]{0,62}[a-z0-9])?\.)+[a-z]{2,}$/;

export function validateHostFile(text: string, kind: "badware" | "plain"): SnapshotValidation {
  const errors: string[] = [];
  if (text.length === 0) errors.push("empty");
  if (text.length > 20_000_000) errors.push("larger than 20 MB");
  const lines = text.split("\n").filter((line) => line.length > 0);
  if (lines.length === 0) errors.push("no hosts");
  if (lines.length > 500_000) errors.push("more than 500000 hosts");
  const sample = lines.slice(0, 50).concat(lines.slice(-10));
  for (const line of sample) {
    const host = kind === "badware" ? line.split("\t")[0] : line;
    const tag = kind === "badware" ? line.split("\t")[1] : "all";
    if (!host || !HOST_RE.test(host)) errors.push(`invalid host: ${host?.slice(0, 80) ?? ""}`);
    if (kind === "badware" && tag !== "all" && tag !== "doc") errors.push(`invalid tag: ${tag}`);
    if (errors.length > 8) break;
  }
  return { ok: errors.length === 0, errors };
}

export function parseBadware(text: string): Map<string, "all" | "doc"> {
  const map = new Map<string, "all" | "doc">();
  for (const line of text.split("\n")) {
    if (!line) continue;
    const [host, tag] = line.split("\t");
    if (!host) continue;
    map.set(host, tag === "doc" ? "doc" : "all");
  }
  return map;
}

export function parsePlain(text: string): Set<string> {
  const set = new Set<string>();
  for (const line of text.split("\n")) {
    if (line) set.add(line.trim().toLowerCase());
  }
  return set;
}

export interface SnapshotState {
  badwareText: string;
  tifText: string;
  trackerText: string;
}

/**
 * Accept a candidate only when every file validates and the counts match.
 * Otherwise keep the previous good snapshot.
 */
export function applySnapshotUpdate(
  current: SnapshotState | null,
  candidate: SnapshotState,
): { snapshot: SnapshotState | null; rolledBack: boolean; reason?: string } {
  const checks = [
    validateHostFile(candidate.badwareText, "badware"),
    validateHostFile(candidate.tifText, "plain"),
    validateHostFile(candidate.trackerText, "plain"),
  ];
  const errors = checks.flatMap((c) => c.errors);
  if (errors.length) {
    return {
      snapshot: current,
      rolledBack: true,
      reason: `rejected update: ${errors.slice(0, 4).join("; ")}`,
    };
  }
  const badware = parseBadware(candidate.badwareText);
  const tif = parsePlain(candidate.tifText);
  if (badware.size < 100 || tif.size < 1000) {
    return { snapshot: current, rolledBack: true, reason: "rejected update: host count below minimum" };
  }
  return { snapshot: candidate, rolledBack: false };
}

const HOUR = 60 * 60 * 1000;

export function listIsStale(retrievedIsoDate: string, expiryHint: string, now = Date.now()): boolean {
  const retrieved = Date.parse(`${retrievedIsoDate}T00:00:00Z`);
  if (!Number.isFinite(retrieved)) return true;
  const hours = /hour/.test(expiryHint) ? Number.parseInt(expiryHint, 10) || 8 : 0;
  const days = /day/.test(expiryHint) ? Number.parseInt(expiryHint, 10) || 4 : 0;
  const ttl = (hours || days * 24 || 24) * HOUR;
  return now - retrieved > ttl;
}

export function snapshotStale(now = Date.now()): boolean {
  return SNAPSHOT_MANIFEST.sources.some((source) => listIsStale(source.retrieved, source.expiryHint, now));
}

export interface DisabledSource {
  id: string;
  reason: string;
  url: string;
}

export const DISABLED_SOURCES: DisabledSource[] = [
  {
    id: "openphish",
    url: "https://openphish.com/terms.html",
    reason:
      "OpenPhish community terms restrict use to personal use and disallow organisational use and redistribution without written consent. Disabled.",
  },
  {
    id: "urlhaus",
    url: "https://urlhaus.abuse.ch/api/",
    reason: "URLhaus requires an Auth-Key, and commercial use may need a paid arrangement. Disabled.",
  },
  {
    id: "phishtank",
    url: "https://phishtank.org/",
    reason:
      "PhishTank redistribution terms were not verified (terms page HTTP 500 on 2026-11-09) and an application key is required. Disabled.",
  },
];

export function sourceStatus(loaded: boolean): Array<Record<string, unknown>> {
  const stale = snapshotStale();
  const rows = SNAPSHOT_MANIFEST.sources.map((source) => ({
    id: source.id,
    title: source.title,
    url: source.url,
    licence: source.licence,
    retrieved: source.retrieved,
    expiryHint: source.expiryHint,
    hosts: source.hosts,
    stale: listIsStale(source.retrieved, source.expiryHint),
    loaded,
    enabled: true,
    inputsNote: source.inputsNote ?? null,
    attribution: source.attribution ?? null,
  }));
  for (const disabled of DISABLED_SOURCES) {
    rows.push({
      id: disabled.id,
      title: disabled.id,
      url: disabled.url,
      licence: "not used",
      retrieved: "2026-11-09",
      expiryHint: "n/a",
      hosts: 0,
      stale: false,
      loaded: false,
      enabled: false,
      inputsNote: disabled.reason,
      attribution: null,
    });
  }
  return rows.map((row) => ({ ...row, bundleStale: stale, bundleVersion: SNAPSHOT_MANIFEST.version }));
}
