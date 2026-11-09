export interface ExtensionStatus {
  browser: string;
  blockingEnabled: boolean;
  trackersEnabled: boolean;
  cleaningEnabled: boolean;
  cosmeticEnabled: boolean;
  paused: boolean;
  pauseUntil: number | null;
  allowlist: string[];
  locationSupported: boolean;
  locationSetting: string;
  locationManaged: boolean;
  rulesets: string[];
}

export async function queryExtension(timeoutMs = 700): Promise<ExtensionStatus | null> {
  const id = crypto.randomUUID();
  return new Promise((resolve) => {
    const timer = window.setTimeout(() => {
      window.removeEventListener("message", onMessage);
      resolve(null);
    }, timeoutMs);
    function onMessage(event: MessageEvent) {
      if (event.source !== window || event.origin !== window.location.origin) return;
      const data = event.data as { source?: string; id?: string; status?: ExtensionStatus | null };
      if (!data || data.source !== "nxtl-shield-ext" || data.id !== id) return;
      window.clearTimeout(timer);
      window.removeEventListener("message", onMessage);
      resolve(data.status ?? null);
    }
    window.addEventListener("message", onMessage);
    window.postMessage({ source: "nxtl-shield-page", id, type: "getStatus" }, window.location.origin);
  });
}

export function commandExtension(type: string, extra: Record<string, unknown> = {}): Promise<ExtensionStatus | null> {
  const id = crypto.randomUUID();
  return new Promise((resolve) => {
    const timer = window.setTimeout(() => {
      window.removeEventListener("message", onMessage);
      resolve(null);
    }, 1500);
    function onMessage(event: MessageEvent) {
      if (event.source !== window || event.origin !== window.location.origin) return;
      const data = event.data as { source?: string; id?: string; status?: ExtensionStatus | null };
      if (!data || data.source !== "nxtl-shield-ext" || data.id !== id) return;
      window.clearTimeout(timer);
      window.removeEventListener("message", onMessage);
      resolve(data.status ?? null);
    }
    window.addEventListener("message", onMessage);
    window.postMessage({ source: "nxtl-shield-page", id, type, ...extra }, window.location.origin);
  });
}
