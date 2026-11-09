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

const tool = process.argv[2];
const raw = process.argv[3] || "{}";
const input = JSON.parse(raw) as Record<string, string>;

const result = await (async () => {
  switch (tool) {
    case "check_url":
      return toolCheckUrl(String(input.url ?? ""));
    case "check_text":
      return toolCheckText(String(input.text ?? ""));
    case "clean_url":
      return toolCleanUrl(String(input.url ?? ""));
    case "get_capabilities":
      return toolCapabilities();
    case "get_source_status":
      return toolSourceStatus();
    case "get_platform_support":
      return toolPlatformSupport();
    case "get_location_privacy_setup":
      return toolLocation(String(input.os ?? "browser"));
    case "get_esim_compatibility_guidance":
      return toolEsimGuidance();
    case "get_esim_coverage_and_rates":
      return toolRates(String(input.country ?? ""));
    case "explain_nxtl_routing":
      return toolRouting();
    case "explain_connection_issue":
      return toolConnection(input as never);
    default:
      return { status: "unsupported", error: "unknown_tool" };
  }
})();

process.stdout.write(JSON.stringify(result));
