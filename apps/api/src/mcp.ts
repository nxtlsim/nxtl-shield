import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import {
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

function text(value: unknown) {
  return { content: [{ type: "text" as const, text: JSON.stringify(value) }] };
}

export function createMcpServer() {
  const server = new McpServer({ name: "nxtl-shield", version: "0.1.0" });
  server.registerTool("check_url", { description: "Check a URL locally against bundled lists. Does not fetch the URL.", inputSchema: { url: z.string().max(8192) } }, async ({ url }) => text(toolCheckUrl(url)));
  server.registerTool("check_text", { description: "Check pasted text locally. Does not send the message.", inputSchema: { text: z.string().max(100000) } }, async ({ text: value }) => text(toolCheckText(value)));
  server.registerTool("clean_url", { description: "Remove conservative tracking parameters. Preserves signed and payment URLs.", inputSchema: { url: z.string().max(8192) } }, async ({ url }) => text(toolCleanUrl(url)));
  server.registerTool("get_capabilities", { description: "Capability manifest for NXTL Shield.", inputSchema: {} }, async () => text(toolCapabilities()));
  server.registerTool("get_source_status", { description: "List snapshot and disabled feeds.", inputSchema: {} }, async () => text(toolSourceStatus()));
  server.registerTool("get_platform_support", { description: "Support matrix.", inputSchema: {} }, async () => text(toolPlatformSupport()));
  server.registerTool("get_location_privacy_setup", { description: "Location privacy steps for an OS or browser.", inputSchema: { os: z.string().max(40).optional() } }, async ({ os }) => text(toolLocation(os || "browser")));
  server.registerTool("get_esim_compatibility_guidance", { description: "NXTL eSIM compatibility guidance. Does not decide a device.", inputSchema: {} }, async () => text(toolEsimGuidance()));
  server.registerTool("get_esim_coverage_and_rates", { description: "EUR per GB from the public NXTL pricing API for one country name.", inputSchema: { country: z.string().max(80) } }, async ({ country }) => text(await toolRates(country)));
  server.registerTool("explain_nxtl_routing", { description: "Explain the published NXTL London internet exit. Not a tunnel status.", inputSchema: {} }, async () => text(await toolRouting()));
  server.registerTool(
    "explain_connection_issue",
    {
      description: "Explain browser-visible or self-reported connection notes. Cannot verify NXTL or a tunnel.",
      inputSchema: {
        online: z.boolean().nullable().optional(),
        reportedPublicWifi: z.enum(["yes", "no", "unknown"]).optional(),
        notes: z.string().max(2000).optional(),
      },
    },
    async (observations) => text(toolConnection(observations)),
  );
  return server;
}

const isDirect = process.argv[1]?.endsWith("mcp.mjs") || process.argv[1]?.endsWith("mcp.ts");
if (isDirect) {
  const server = createMcpServer();
  await server.connect(new StdioServerTransport());
}
