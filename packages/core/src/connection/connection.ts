import { NXTL_LINKS } from "../esim/esim";

export interface ConnectionObservations {
  online?: boolean | null;
  userAgent?: string;
  effectiveType?: string | null;
  publicIp?: string | null;
  ipLookup?: "not_run" | "ran" | "failed";
  webrtcHostCandidates?: number | null;
  webrtcServerReflexive?: number | null;
  reportedPublicWifi?: "yes" | "no" | "unknown";
  reportedDnsProfile?: "yes" | "no" | "unknown";
  notes?: string;
}

export interface ConnectionExplanation {
  summary: string;
  points: string[];
  status: "not_verified";
  scope: string;
  timestamp: string;
  transmission: "local";
  links: { connectionCheck: string; setup: string };
}

export function explainConnectionIssue(obs: ConnectionObservations, now = new Date()): ConnectionExplanation {
  const points: string[] = [];
  points.push("Shield only explains the signals you supplied or that this browser exposed. It cannot see the SIM, the APN, the VPN state, or the operating-system DNS resolver.");
  if (obs.online === false) points.push("The browser reported offline. That is a local network hint, not a diagnosis of the SIM.");
  if (obs.online === true) points.push("The browser reported online. That does not identify which interface is carrying the traffic.");
  if (obs.effectiveType) {
    points.push(`The Network Information API reported “${obs.effectiveType}”. Chromium exposes this hint. It is not a measured speed and not proof of cellular or Wi-Fi.`);
  }
  if (obs.ipLookup === "ran" && obs.publicIp) {
    points.push(`A disclosed lookup returned ${obs.publicIp}. That is the address the lookup service saw. It does not prove NXTL, a VPN, or a city. Shield does not add a geolocation database.`);
  } else if (obs.ipLookup === "failed") {
    points.push("The public-IP lookup failed. No address is invented.");
  } else {
    points.push("No public-IP lookup was run.");
  }
  if (typeof obs.webrtcHostCandidates === "number" || typeof obs.webrtcServerReflexive === "number") {
    points.push(
      `WebRTC candidate counts you supplied: host ${obs.webrtcHostCandidates ?? "n/a"}, server-reflexive ${obs.webrtcServerReflexive ?? "n/a"}. Host candidates can reveal a local address to this page. They are not a full leak test and they do not prove a tunnel.`,
    );
  }
  if (obs.reportedPublicWifi === "yes") {
    points.push("You said you are on public Wi-Fi. Shield has no evidence that this network is malicious. Leaving it for mobile data avoids depending on that local network. NXTL mobile data is an optional paid way to do that.");
  }
  if (obs.reportedDnsProfile === "yes") {
    points.push("You said a DNS profile is installed. Shield cannot confirm that. Use the provider's own check page. Only a confirming result should be treated as verified, and even then it is the check page's claim.");
  }
  if (obs.reportedDnsProfile === "no") points.push("You said no DNS profile is installed. Device DNS is then whatever the network or operating system uses.");
  if (obs.userAgent) points.push("A user-agent string identifies the browser's claim about itself. It is not a verified device model.");
  if (obs.notes) points.push(`Your note was stored only in this explanation: ${obs.notes.slice(0, 500)}`);
  points.push("For a latency and throughput check, use the existing NXTL travel connection check. Shield does not duplicate it.");
  points.push("Connection status for NXTL or any tunnel stays “not verified”.");
  return {
    summary: "Connection not verified. The notes below are limited to browser-exposed or self-reported signals.",
    points,
    status: "not_verified",
    scope: "Browser hints and the fields in this request. No packet capture and no device DNS read.",
    timestamp: now.toISOString(),
    transmission: "local",
    links: { connectionCheck: NXTL_LINKS.connectionCheck, setup: NXTL_LINKS.setup },
  };
}

export const IP_LOOKUP = {
  url: "https://api.ipify.org?format=json",
  disclosure:
    "If you choose Look up public IP, this browser sends a request to https://api.ipify.org (ipify). The response is a JSON IP address. Shield does not send your checks, passwords, or files with it. The address cannot prove NXTL or a VPN.",
};
