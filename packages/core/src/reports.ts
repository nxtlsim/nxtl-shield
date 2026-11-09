import type { Verdict } from "./types";

export interface ReportEntry {
  id: string;
  at: string;
  kind: "url" | "text" | "file" | "clean" | "qr";
  verdict: Verdict;
  redacted: string;
}

const KEY = "nxtl-shield-reports";

export function reportKey(): string {
  return KEY;
}

export function makeReport(kind: ReportEntry["kind"], verdict: Verdict, redacted: string, now = new Date()): ReportEntry {
  return {
    id: crypto.randomUUID(),
    at: now.toISOString(),
    kind,
    verdict,
    redacted: redacted.slice(0, 240),
  };
}

export function loadReports(storage: Pick<Storage, "getItem">): ReportEntry[] {
  try {
    const raw = storage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as ReportEntry[];
    if (!Array.isArray(parsed)) return [];
    return parsed.slice(0, 100);
  } catch {
    return [];
  }
}

export function saveReports(storage: Pick<Storage, "setItem">, entries: ReportEntry[]): void {
  storage.setItem(KEY, JSON.stringify(entries.slice(0, 100)));
}

export function clearReports(storage: Pick<Storage, "removeItem">): void {
  storage.removeItem(KEY);
}
