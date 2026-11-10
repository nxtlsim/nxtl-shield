export interface ConnectionInfo {
  ipv4: string | null;
  ipv6: string | null;
  city: string | null;
  country: string | null;
  countryCode: string | null;
  flagEmoji: string | null;
  provider: string | null;
}

export interface DnsProbeResult {
  status: "on" | "off" | "unknown";
  detail: string;
}

let sessionCache: ConnectionInfo | null = null;

export function clearConnectionCache(): void {
  sessionCache = null;
}

/**
 * Parses raw ipwho.is response JSON into structured ConnectionInfo.
 */
export function parseIpwhoisResponse(data: any): ConnectionInfo {
  const ip = typeof data?.ip === "string" ? data.ip : null;
  const isV6 = data?.type === "IPv6" || (ip && ip.includes(":"));
  return {
    ipv4: !isV6 ? ip : null,
    ipv6: isV6 ? ip : null,
    city: typeof data?.city === "string" ? data.city : null,
    country: typeof data?.country === "string" ? data.country : null,
    countryCode: typeof data?.country_code === "string" ? data.country_code : null,
    flagEmoji: typeof data?.flag?.emoji === "string" ? data.flag.emoji : null,
    provider: typeof data?.connection?.org === "string" ? data.connection.org : (data?.connection?.isp ?? null),
  };
}

/**
 * Parses raw ipapi.co response JSON into structured ConnectionInfo.
 */
export function parseIpapiResponse(data: any): ConnectionInfo {
  const ip = typeof data?.ip === "string" ? data.ip : null;
  const isV6 = ip && ip.includes(":");
  return {
    ipv4: !isV6 ? ip : null,
    ipv6: isV6 ? ip : null,
    city: typeof data?.city === "string" ? data.city : null,
    country: typeof data?.country_name === "string" ? data.country_name : null,
    countryCode: typeof data?.country_code === "string" ? data.country_code : null,
    flagEmoji: null,
    provider: typeof data?.org === "string" ? data.org : null,
  };
}

async function fetchWithTimeout(url: string, timeoutMs = 5000): Promise<Response> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { signal: controller.signal });
  } finally {
    clearTimeout(id);
  }
}

/**
 * Fetches public connection details using free CORS-friendly lookups with fallbacks.
 * Results are cached in memory for the active browser session.
 */
export async function fetchConnectionInfo(forceRefresh = false): Promise<ConnectionInfo> {
  if (sessionCache && !forceRefresh) {
    return sessionCache;
  }

  let info: ConnectionInfo | null = null;

  // 1. Primary: ipwho.is
  try {
    const res = await fetchWithTimeout("https://ipwho.is/", 5000);
    if (res.ok) {
      const data = await res.json();
      if (data && data.success !== false) {
        info = parseIpwhoisResponse(data);
      }
    }
  } catch {
    /* Fallback to secondary */
  }

  // 2. Secondary fallback: ipapi.co
  if (!info) {
    try {
      const res = await fetchWithTimeout("https://ipapi.co/json/", 5000);
      if (res.ok) {
        const data = await res.json();
        info = parseIpapiResponse(data);
      }
    } catch {
      /* Fallback to IP-only */
    }
  }

  // 3. Fallback: ipify IP-only
  if (!info) {
    try {
      const res = await fetchWithTimeout("https://api.ipify.org?format=json", 4000);
      if (res.ok) {
        const data = await res.json();
        info = {
          ipv4: data.ip ?? null,
          ipv6: null,
          city: null,
          country: null,
          countryCode: null,
          flagEmoji: null,
          provider: null,
        };
      }
    } catch {
      /* No IP reachable */
    }
  }

  // If we have IPv4, optionally check api64 for IPv6 presence
  if (info && !info.ipv6) {
    try {
      const res6 = await fetchWithTimeout("https://api64.ipify.org?format=json", 3000);
      if (res6.ok) {
        const data6 = await res6.json();
        if (typeof data6?.ip === "string" && data6.ip.includes(":")) {
          info.ipv6 = data6.ip;
        }
      }
    } catch {
      /* ignore IPv6 secondary check */
    }
  }

  if (info && !info.ipv4) {
    try {
      const res4 = await fetchWithTimeout("https://api.ipify.org?format=json", 3000);
      if (res4.ok) {
        const data4 = await res4.json();
        if (typeof data4?.ip === "string" && !data4.ip.includes(":")) {
          info.ipv4 = data4.ip;
        }
      }
    } catch {
      /* ignore IPv4 secondary check */
    }
  }

  if (info) {
    sessionCache = info;
    return info;
  }

  throw new Error("Could not read connection details.");
}

/** Control lookup used by the Safe DNS probe. Must stay on the web app CSP connect-src list. */
export const DNS_PROBE_CONTROL_URL = "https://api.ipify.org?format=json";

/** Advertising test host blocked by common Safe DNS profiles. Keep in sync with scripts/build_extension_rules.py. */
export const DNS_PROBE_BLOCKED_HOST = "pagead2.googlesyndication.com";
export const DNS_PROBE_BLOCKED_PATH = "/pagead/show_ads.js";
export const DNS_PROBE_BLOCKED_URL = `https://${DNS_PROBE_BLOCKED_HOST}${DNS_PROBE_BLOCKED_PATH}`;

/** True when a request was blocked by this browser or extension, not by Safe DNS. */
export function isExtensionClientBlock(error: unknown): boolean {
  const text =
    error instanceof Error
      ? `${error.name} ${error.message} ${error.cause ?? ""}`
      : String(error);
  return /ERR_BLOCKED_BY_CLIENT|BLOCKED_BY_CLIENT|blocked by client/i.test(text);
}

/**
 * Tests whether Safe DNS is actively filtering network requests.
 * Uses a control request vs a known advertising test host.
 * A block by this extension itself is not treated as Safe DNS being on.
 */
export async function probeDns(options?: {
  controlUrl?: string;
  blockedUrl?: string;
  timeoutMs?: number;
}): Promise<DnsProbeResult> {
  const timeoutMs = options?.timeoutMs ?? 4000;
  const controlUrl = options?.controlUrl ?? DNS_PROBE_CONTROL_URL;
  const blockedUrl = options?.blockedUrl ?? DNS_PROBE_BLOCKED_URL;

  let controlOk = false;
  let blockedOk = false;

  // Test control
  try {
    const ctrlController = new AbortController();
    const ctrlTimer = setTimeout(() => ctrlController.abort(), timeoutMs);
    await fetch(controlUrl, {
      mode: "no-cors",
      signal: ctrlController.signal,
      cache: "no-store",
    });
    clearTimeout(ctrlTimer);
    controlOk = true;
  } catch {
    controlOk = false;
  }

  if (!controlOk) {
    return {
      status: "unknown",
      detail: "Could not check DNS: network or internet connection is not responding.",
    };
  }

  // Test blocked host
  try {
    const blkController = new AbortController();
    const blkTimer = setTimeout(() => blkController.abort(), timeoutMs);
    await fetch(blockedUrl, {
      mode: "no-cors",
      signal: blkController.signal,
      cache: "no-store",
    });
    clearTimeout(blkTimer);
    blockedOk = true; // Request reached the network -> Safe DNS is not blocking this host
  } catch (error) {
    if (isExtensionClientBlock(error)) {
      return {
        status: "unknown",
        detail: "Could not check Safe DNS.",
      };
    }
    blockedOk = false; // The test host failed to load, e.g. it did not resolve
  }

  if (!blockedOk) {
    return {
      status: "on",
      detail: "Safe DNS looks on: advertising and malicious test domains are blocked.",
    };
  }

  return {
    status: "off",
    detail: "Safe DNS does not look on: known advertising and tracking domains are reachable.",
  };
}
