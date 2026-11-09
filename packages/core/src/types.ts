/** Verdicts are fixed. Unknown results are never called safe. */
export type Verdict =
  | "known_malicious_match"
  | "suspicious_indicators"
  | "no_known_match"
  | "inconclusive"
  | "unavailable"
  | "unsupported";

export type EvidenceSeverity = "info" | "indicator" | "match";

export interface Evidence {
  id: string;
  title: string;
  detail: string;
  severity: EvidenceSeverity;
  source?: {
    name: string;
    retrieved: string;
    licence: string;
  };
}

export interface CheckBase {
  verdict: Verdict;
  summary: string;
  evidence: Evidence[];
  scope: string;
  timestamp: string;
  /** Redacted echo of the input. Secrets are not returned. */
  inputRedacted: string;
  uncertainty: string;
  /** Where the input was processed. */
  transmission: "local" | "nxtl" | "third_party";
  staleLists: boolean;
}

export type UserStatus =
  | "works_automatically"
  | "needs_setup"
  | "needs_native"
  | "unsupported"
  | "not_built";

export type ImplementationStatus =
  | "implemented-and-verified"
  | "implemented-but-not-device-verified"
  | "externally-integrated"
  | "manual-only"
  | "awaiting-access"
  | "unsupported-on-platform"
  | "unavailable-data-source"
  | "not-yet-implemented";

export interface Capability {
  id: string;
  name: string;
  userStatus: UserStatus;
  implementationStatus: ImplementationStatus;
  summary: string;
  scope: string;
  limitations: string;
  sourceUrl?: string;
  sourceAccessed?: string;
  costOwner: string;
}
