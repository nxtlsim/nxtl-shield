import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { once } from "node:events";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { createApiServer } from "../src/http";
import { toolCheckUrl } from "../src/logic";

describe("API contracts", () => {
  it("does not fetch a submitted URL, including metadata addresses", async () => {
    const calls: string[] = [];
    const original = globalThis.fetch;
    globalThis.fetch = (async (url: string) => {
      calls.push(String(url));
      return new Response("nope", { status: 500 });
    }) as typeof fetch;
    const result = toolCheckUrl("http://169.254.169.254/latest/meta-data/");
    expect(calls).toEqual([]);
    expect(JSON.stringify(result)).not.toContain("ami-id");
    globalThis.fetch = original;
  });

  it("serves check_url and capabilities over HTTP", async () => {
    const server = createApiServer();
    server.listen(0, "127.0.0.1");
    await once(server, "listening");
    const address = server.address();
    if (!address || typeof address === "string") throw new Error("no port");
    const base = `http://127.0.0.1:${address.port}`;
    const health = await fetch(`${base}/v1/capabilities`);
    expect(health.status).toBe(200);
    expect(health.headers.get("cache-control")).toBe("no-store");
    const body = (await health.json()) as { capabilities: { id: string }[] };
    expect(body.capabilities.length).toBeGreaterThan(10);
    const checked = await fetch(`${base}/v1/check_url`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ url: "http://169.254.169.254/" }),
    });
    const payload = (await checked.json()) as { result: { verdict: string } };
    expect(payload.result.verdict).toBe("suspicious_indicators");
    const huge = await fetch(`${base}/v1/check_url`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ url: "https://example.com/" + "a".repeat(9000) }),
    });
    expect(((await huge.json()) as { error: string }).error).toBe("input_too_large");
    server.close();
  });
});

describe("MCP client", () => {
  it("calls check_url through the official SDK", async () => {
    const transport = new StdioClientTransport({
      command: process.execPath,
      args: [join(process.cwd(), "node_modules/tsx/dist/cli.mjs"), join(process.cwd(), "apps/api/src/mcp.ts")],
      cwd: process.cwd(),
      env: process.env as Record<string, string>,
      stderr: "pipe",
    });
    const client = new Client({ name: "nxtl-shield-test", version: "0.1.0" });
    await client.connect(transport);
    const result = await client.callTool({ name: "check_url", arguments: { url: "https://paypal.com.evil.example/" } });
    const text = (result.content as { text: string }[])[0]?.text ?? "";
    expect(text).toContain("suspicious_indicators");
    expect(text).toContain("not proof of phishing");
    await client.close();
  });
});
