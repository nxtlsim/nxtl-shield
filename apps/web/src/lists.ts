import { parseBadware, parsePlain, SNAPSHOT_MANIFEST, snapshotStale, type Reputation } from "@nxtl/core";

let cached: Reputation | null = null;
let failure: string | null = null;

async function sha256(text: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export function listFailure(): string | null {
  return failure;
}

export async function loadReputation(): Promise<Reputation> {
  if (cached) return cached;
  const base = import.meta.env.BASE_URL;
  try {
    const [badwareText, tifText, trackerText] = await Promise.all(
      ["badware-hosts.txt", "tif-hosts.txt", "tracker-hosts.txt"].map((name) =>
        fetch(`${base}lists/${name}`).then((response) => {
          if (!response.ok) throw new Error(name);
          return response.text();
        }),
      ),
    );
    const hashes = await Promise.all([sha256(badwareText), sha256(tifText), sha256(trackerText)]);
    const expected = SNAPSHOT_MANIFEST.sha256;
    if (
      hashes[0] !== expected["badware-hosts.txt"] ||
      hashes[1] !== expected["tif-hosts.txt"] ||
      hashes[2] !== expected["tracker-hosts.txt"]
    ) {
      failure = "The list snapshot failed its integrity check and was not used.";
      cached = {
        badware: new Map(),
        tif: new Set(),
        trackers: new Set(),
        available: false,
        stale: true,
        version: SNAPSHOT_MANIFEST.version,
        retrieved: "2026-11-09",
      };
      return cached;
    }
    cached = {
      badware: parseBadware(badwareText),
      tif: parsePlain(tifText),
      trackers: parsePlain(trackerText),
      available: true,
      stale: snapshotStale(),
      version: SNAPSHOT_MANIFEST.version,
      retrieved: "2026-11-09",
    };
    failure = null;
    return cached;
  } catch {
    failure = "The list snapshot could not be loaded.";
    cached = {
      badware: new Map(),
      tif: new Set(),
      trackers: new Set(),
      available: false,
      stale: true,
      version: SNAPSHOT_MANIFEST.version,
      retrieved: "2026-11-09",
    };
    return cached;
  }
}
