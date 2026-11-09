import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import {
  envelope,
  toolCapabilities,
  toolCheckText,
  toolCheckUrl,
  toolCleanUrl,
  toolConnection,
  toolEsimGuidance,
  toolLocation,
  toolPlatformSupport,
  toolRates,
  toolRouting,
  toolSourceStatus,
} from "./logic";
import type { ConnectionObservations } from "@nxtl/core";

const hits = new Map<string, { n: number; reset: number }>();

function limited(ip: string): boolean {
  const now = Date.now();
  const row = hits.get(ip);
  if (!row || row.reset < now) {
    hits.set(ip, { n: 1, reset: now + 60_000 });
    return false;
  }
  row.n += 1;
  return row.n > 60;
}

async function readBody(req: IncomingMessage): Promise<string> {
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > 120_000) throw new Error("too_large");
    chunks.push(chunk as Buffer);
  }
  return Buffer.concat(chunks).toString("utf8");
}

function send(res: ServerResponse, status: number, body: unknown) {
  const payload = JSON.stringify(envelope(body));
  res.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
    "x-content-type-options": "nosniff",
    "x-frame-options": "DENY",
    "access-control-allow-origin": "*",
    "access-control-allow-headers": "content-type",
    "access-control-allow-methods": "GET, POST, OPTIONS",
  });
  res.end(payload);
}

export function createApiServer() {
  return createServer(async (req, res) => {
    const url = new URL(req.url || "/", "http://127.0.0.1");
    if (req.method === "OPTIONS") return send(res, 204, {});
    const ip = req.socket.remoteAddress || "local";
    if (limited(ip)) return send(res, 429, { status: "unavailable", error: "rate_limited" });
    try {
      if (req.method === "GET" && url.pathname === "/v1/health") return send(res, 200, { status: "ok", service: "nxtl-shield" });
      if (req.method === "GET" && url.pathname === "/v1/capabilities") return send(res, 200, toolCapabilities());
      if (req.method === "GET" && url.pathname === "/v1/source_status") return send(res, 200, toolSourceStatus());
      if (req.method === "GET" && url.pathname === "/v1/platform_support") return send(res, 200, toolPlatformSupport());
      if (req.method === "GET" && url.pathname === "/v1/location_privacy_setup") return send(res, 200, toolLocation(url.searchParams.get("os") || "browser"));
      if (req.method === "GET" && url.pathname === "/v1/esim_compatibility_guidance") return send(res, 200, toolEsimGuidance());
      if (req.method === "GET" && url.pathname === "/v1/explain_nxtl_routing") return send(res, 200, await toolRouting());
      if (req.method === "GET" && url.pathname === "/v1/esim_coverage_and_rates") {
        return send(res, 200, await toolRates(url.searchParams.get("country") || ""));
      }
      if (req.method === "POST") {
        const raw = await readBody(req);
        const json = raw ? JSON.parse(raw) : {};
        if (url.pathname === "/v1/check_url") return send(res, 200, toolCheckUrl(String(json.url ?? "")));
        if (url.pathname === "/v1/check_text") return send(res, 200, toolCheckText(String(json.text ?? "")));
        if (url.pathname === "/v1/clean_url") return send(res, 200, toolCleanUrl(String(json.url ?? "")));
        if (url.pathname === "/v1/explain_connection_issue") {
          return send(res, 200, toolConnection((json.observations ?? {}) as ConnectionObservations));
        }
      }
      send(res, 404, { status: "unsupported", error: "not_found" });
    } catch (error) {
      const code = error instanceof Error && error.message === "too_large" ? "input_too_large" : "bad_request";
      send(res, 400, { status: "unsupported", error: code });
    }
  });
}

const port = Number(process.env.PORT || 8787);
if (process.argv[1] && process.argv[1].endsWith("http.mjs")) {
  createApiServer().listen(port, "0.0.0.0", () => {
    console.error(`NXTL Shield API listening on ${port}`);
  });
}
