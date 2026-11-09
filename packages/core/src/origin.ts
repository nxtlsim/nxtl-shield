export interface OriginException {
  input: string;
  ok: boolean;
  origin?: string;
  pattern?: string;
  host?: string;
  notes: string[];
  error?: string;
}

/**
 * Turn a user-entered URL into one exact origin pattern.
 * https://www.google.com/maps is origin https://www.google.com, not a separate origin
 * and not every Google subdomain.
 */
export function originException(input: string): OriginException {
  const trimmed = input.trim();
  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    return {
      input,
      ok: false,
      notes: [],
      error: "Enter a full URL including http:// or https://.",
    };
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") {
    return {
      input,
      ok: false,
      notes: [],
      error: "Only http and https origins can be exceptions.",
    };
  }
  if (!url.hostname || url.hostname === "") {
    return { input, ok: false, notes: [], error: "That URL has no host." };
  }
  const origin = url.origin;
  const pattern = `${origin}/*`;
  const notes: string[] = [];
  if (url.hostname === "www.google.com") {
    notes.push(
      "https://www.google.com/maps uses the origin https://www.google.com. An exception covers every page on that exact host, including Maps. It does not cover maps.google.com, google.com, or other Google domains.",
    );
  } else if (url.hostname === "maps.google.com") {
    notes.push(
      "maps.google.com is a different origin from https://www.google.com. An exception here does not cover www.google.com/maps.",
    );
  }
  if (url.pathname && url.pathname !== "/") {
    notes.push(
      "The path is not part of the origin. This exception is the scheme and host only. It is not limited to one path, and it is not widened to sibling subdomains.",
    );
  }
  notes.push(
    "Browser location exceptions apply only in the browser where the extension is installed. They do not change app permissions or hide an IP address.",
  );
  return { input, ok: true, origin, pattern, host: url.hostname, notes };
}
