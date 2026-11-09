export type BlockingDecision = "block" | "allow" | "none";

export function blockingDecision(input: {
  listed: boolean;
  allowlisted: boolean;
  paused: boolean;
}): { decision: BlockingDecision; reason: "paused" | "allowlisted" | "listed" | "not_listed" } {
  if (!input.listed && !input.paused) {
    return { decision: "none", reason: "not_listed" };
  }
  if (input.paused) return { decision: "allow", reason: "paused" };
  if (input.allowlisted) return { decision: "allow", reason: "allowlisted" };
  if (input.listed) return { decision: "block", reason: "listed" };
  return { decision: "none", reason: "not_listed" };
}

export function hostMatchesAllowlist(hostname: string, allowlist: readonly string[]): boolean {
  const host = hostname.toLowerCase().replace(/\.$/, "");
  for (const raw of allowlist) {
    const entry = raw.toLowerCase().replace(/\.$/, "").replace(/^\*\./, "");
    if (!entry) continue;
    if (host === entry || host.endsWith(`.${entry}`)) return true;
  }
  return false;
}
