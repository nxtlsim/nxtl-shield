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

  if (info) {
    sessionCache = info;
    return info;
  }

  throw new Error("Could not read connection details.");
}

/**
 * Tests whether Safe DNS / ad & scam blocking is actively filtering network requests.
 * Uses a control request vs a known blocked advertising test host.
 */
export async function probeDns(options?: {
  controlUrl?: string;
  blockedUrl?: string;
  timeoutMs?: number;
}): Promise<DnsProbeResult> {
  const timeoutMs = options?.timeoutMs ?? 4000;
  // Control: harmless known-good asset
  const controlUrl = options?.controlUrl ?? "https://dns.google/resolve?name=example.com&type=A";
  // Blocked host: standard ad host blocked by adguard-default / threat lists
  const blockedUrl = options?.blockedUrl ?? "https://pagead2.googlesyndication.com/pagead/show_ads.js";

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
    blockedOk = true; // Request succeeded -> blocking is NOT on
  } catch {
    blockedOk = false; // Request failed / rejected by DNS -> blocking IS ON
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
