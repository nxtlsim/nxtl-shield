export interface ParsedIp {
  family: "ipv4" | "ipv6";
  /** Canonical form when we could normalise it. */
  canonical?: string;
  alternateEncoding: boolean;
  special: string[];
}

function ipv4ToInt(parts: number[]): number | null {
  if (parts.some((n) => !Number.isInteger(n) || n < 0 || n > 255)) return null;
  return (((parts[0]! << 24) >>> 0) + (parts[1]! << 16) + (parts[2]! << 8) + parts[3]!) >>> 0;
}

export function canonicalIpv4(int: number): string {
  return [(int >>> 24) & 255, (int >>> 16) & 255, (int >>> 8) & 255, int & 255].join(".");
}

function specialV4(int: number): string[] {
  const notes: string[] = [];
  const a = (int >>> 24) & 255;
  const b = (int >>> 16) & 255;
  if (a === 0) notes.push("this-host / 0.0.0.0/8");
  if (a === 10) notes.push("private 10.0.0.0/8");
  if (a === 127) notes.push("loopback 127.0.0.0/8");
  if (a === 169 && b === 254) notes.push("link-local 169.254.0.0/16");
  if (int === 0xa9fea9fe) notes.push("link-local metadata address 169.254.169.254");
  if (a === 172 && b >= 16 && b <= 31) notes.push("private 172.16.0.0/12");
  if (a === 192 && b === 168) notes.push("private 192.168.0.0/16");
  if (a === 100 && b >= 64 && b <= 127) notes.push("shared address 100.64.0.0/10");
  if (a === 192 && b === 0 && ((int >>> 8) & 255) === 2) notes.push("documentation 192.0.2.0/24");
  if (a === 198 && b === 51 && ((int >>> 8) & 255) === 100) notes.push("documentation 198.51.100.0/24");
  if (a === 203 && b === 0 && ((int >>> 8) & 255) === 113) notes.push("documentation 203.0.113.0/24");
  if (int === 0xffffffff) notes.push("limited broadcast");
  if (a >= 224 && a <= 239) notes.push("multicast");
  if (a >= 240) notes.push("reserved");
  return notes;
}

function parseDotted(raw: string): { int: number; alternate: boolean } | null {
  const pieces = raw.split(".");
  if (pieces.length < 1 || pieces.length > 4) return null;
  const nums: number[] = [];
  let alternate = pieces.length !== 4;
  for (const piece of pieces) {
    if (!piece) return null;
    let value: number;
    if (/^0x[0-9a-f]+$/i.test(piece)) {
      value = Number.parseInt(piece.slice(2), 16);
      alternate = true;
    } else if (/^0[0-7]+$/.test(piece)) {
      value = Number.parseInt(piece, 8);
      alternate = true;
    } else if (/^\d+$/.test(piece)) {
      value = Number.parseInt(piece, 10);
      if (piece.length > 1 && piece.startsWith("0")) alternate = true;
    } else {
      return null;
    }
    if (!Number.isFinite(value) || value < 0) return null;
    nums.push(value);
  }
  // Fewer than 4 parts: the last part fills the remaining octets (decimal dword style).
  if (nums.length === 1) {
    if (nums[0]! > 0xffffffff) return null;
    return { int: nums[0]! >>> 0, alternate: true };
  }
  const remaining = 4 - (nums.length - 1);
  const head = nums.slice(0, -1);
  const tail = nums[nums.length - 1]!;
  if (head.some((n) => n > 255)) return null;
  const maxTail = 2 ** (8 * remaining) - 1;
  if (tail > maxTail) return null;
  let int = 0;
  for (const n of head) int = (int << 8) + n;
  int = (int << (8 * remaining)) + tail;
  const parts = canonicalIpv4(int >>> 0).split(".").map((n) => Number(n));
  if (ipv4ToInt(parts) === null) return null;
  return { int: int >>> 0, alternate };
}

function isIpv6Literal(host: string): boolean {
  const bare = host.replace(/^\[|\]$/g, "");
  if (!bare.includes(":")) return false;
  if (!/^[0-9a-f:.]+$/i.test(bare)) return false;
  const halves = bare.split("::");
  if (halves.length > 2) return false;
  return true;
}

export function inspectHostLiteral(rawHost: string, normalisedHost: string): ParsedIp | null {
  const raw = rawHost.replace(/^\[|\]$/g, "");
  const norm = normalisedHost.replace(/^\[|\]$/g, "");
  if (isIpv6Literal(raw) || isIpv6Literal(norm) || norm.includes(":")) {
    const special: string[] = [];
    const lower = norm.toLowerCase();
    if (lower === "::1" || lower === "0:0:0:0:0:0:0:1") special.push("IPv6 loopback");
    if (lower.startsWith("fe80:")) special.push("IPv6 link-local");
    if (lower.startsWith("fc") || lower.startsWith("fd")) special.push("IPv6 unique local");
    if (lower.startsWith("::ffff:")) special.push("IPv4-mapped IPv6");
    return {
      family: "ipv6",
      canonical: norm,
      alternateEncoding: raw.toLowerCase() !== norm.toLowerCase(),
      special,
    };
  }
  const parsed = parseDotted(raw);
  const normParsed = /^\d{1,3}(\.\d{1,3}){3}$/.test(norm) ? parseDotted(norm) : null;
  if (!parsed && !normParsed) return null;
  const chosen = parsed ?? normParsed;
  if (!chosen) return null;
  const canonical = canonicalIpv4(chosen.int);
  const alternate =
    chosen.alternate || (parsed !== null && normParsed !== null && raw !== canonical) || raw !== norm;
  return {
    family: "ipv4",
    canonical,
    alternateEncoding: alternate && raw !== canonical,
    special: specialV4(chosen.int),
  };
}

export function rawHostFromInput(input: string): string | null {
  const match = input.trim().match(/^[a-z][a-z0-9+.-]*:\/\/(?:[^/?#@]*@)?(\[[^\]]+\]|[^/?#:]+)/i);
  return match?.[1] ?? null;
}
