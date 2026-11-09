import { LIMITS } from "../limits";
import type { Evidence, Verdict } from "../types";

const EXEC = new Set(["exe", "scr", "js", "jse", "vbs", "vbe", "bat", "cmd", "msi", "apk", "dmg", "com", "pif", "hta", "ps1", "jar", "dll", "lnk"]);
const LOOKS_LIKE_DOC = new Set(["pdf", "doc", "docx", "xls", "xlsx", "ppt", "pptx", "jpg", "jpeg", "png", "gif", "txt", "mp3", "mp4", "zip", "csv"]);
const ARCHIVE_PAIRS = new Set(["tar.gz", "tar.bz2", "tar.xz", "tar.zst"]);

const MAGIC: { ext: string[]; bytes: number[]; label: string }[] = [
  { ext: ["pdf"], bytes: [0x25, 0x50, 0x44, 0x46], label: "PDF" },
  { ext: ["png"], bytes: [0x89, 0x50, 0x4e, 0x47], label: "PNG" },
  { ext: ["jpg", "jpeg"], bytes: [0xff, 0xd8, 0xff], label: "JPEG" },
  { ext: ["gif"], bytes: [0x47, 0x49, 0x46, 0x38], label: "GIF" },
  { ext: ["zip", "docx", "xlsx", "pptx", "apk", "jar"], bytes: [0x50, 0x4b, 0x03, 0x04], label: "ZIP" },
  { ext: ["exe", "dll", "scr"], bytes: [0x4d, 0x5a], label: "MZ executable" },
];

const EICAR = "X5O!P%@AP[4\\PZX54(P^)7CC)7}$EICAR-STANDARD-ANTIVIRUS-TEST-FILE!$H+H*";

export interface FileInspection {
  verdict: Verdict;
  summary: string;
  evidence: Evidence[];
  scope: string;
  timestamp: string;
  transmission: "local";
  uncertainty: string;
  fileName: string;
  sha256: string | null;
  notAMalwareScan: true;
}

export function extensionOf(name: string): string[] {
  const base = name.split(/[/\\]/).pop() ?? name;
  return base.split(".").slice(1).map((part) => part.toLowerCase());
}

export function inspectFileName(name: string): Evidence[] {
  const evidence: Evidence[] = [];
  if (!name || name.length > LIMITS.fileName) {
    evidence.push({
      id: "name-length",
      title: "File name was not fully checked",
      detail: "The file name is missing or longer than 1024 characters.",
      severity: "info",
    });
    return evidence;
  }
  if (/[\u202A-\u202E\u2066-\u2069]/.test(name)) {
    evidence.push({
      id: "bidi-name",
      title: "Bidirectional characters in the file name",
      detail: "The name contains a bidirectional override. The extension you see may not be the last one.",
      severity: "indicator",
    });
  }
  const trimmed = name.trim();
  if (trimmed !== name || /[. ]$/.test(trimmed)) {
    evidence.push({
      id: "trailing",
      title: "Trailing space or dot",
      detail: "The name has leading or trailing whitespace, or a trailing dot. Some systems hide the real extension that way.",
      severity: "indicator",
    });
  }
  const parts = extensionOf(trimmed);
  if (parts.length >= 2) {
    const pair = parts.slice(-2).join(".");
    const last = parts[parts.length - 1]!;
    const earlier = parts.slice(0, -1);
    if (!ARCHIVE_PAIRS.has(pair) && EXEC.has(last) && earlier.some((ext) => LOOKS_LIKE_DOC.has(ext))) {
      evidence.push({
        id: "double-ext",
        title: "Double extension",
        detail: `The name ends in .${pair}. A document-like extension is followed by an executable-style extension. That is suspicious formatting, not proof of malware.`,
        severity: "indicator",
      });
    }
  }
  return evidence;
}

export function inspectMagic(name: string, bytes: Uint8Array): Evidence[] {
  const evidence: Evidence[] = [];
  const ext = extensionOf(name).pop() ?? "";
  if (bytes.length < 4) return evidence;
  const asText = new TextDecoder().decode(bytes.slice(0, Math.min(bytes.length, 128)));
  if (asText.includes("EICAR-STANDARD-ANTIVIRUS-TEST-FILE") || asText.includes(EICAR.slice(0, 20))) {
    evidence.push({
      id: "eicar",
      title: "EICAR test string",
      detail: "The file begins with a well-known harmless test pattern. This is only a text match, not a full malware scan.",
      severity: "info",
    });
  }
  for (const magic of MAGIC) {
    const matches = magic.bytes.every((byte, index) => bytes[index] === byte);
    if (!matches) continue;
    if (ext && !magic.ext.includes(ext)) {
      evidence.push({
        id: "magic-mismatch",
        title: "File type does not match the extension",
        detail: `The name ends in .${ext}, but the first bytes look like ${magic.label}. That can be misleading. It is not a malware verdict.`,
        severity: "indicator",
      });
    }
    break;
  }
  return evidence;
}

export async function sha256Hex(bytes: Uint8Array): Promise<string> {
  const copy = new Uint8Array(bytes.byteLength);
  copy.set(bytes);
  const digest = await crypto.subtle.digest("SHA-256", copy);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export async function inspectFile(name: string, bytes: Uint8Array | null, now = new Date()): Promise<FileInspection> {
  const evidence = [...inspectFileName(name), ...(bytes ? inspectMagic(name, bytes) : [])];
  let sha256: string | null = null;
  if (bytes && bytes.byteLength > LIMITS.fileBytes) {
    evidence.push({
      id: "too-large",
      title: "Hash skipped",
      detail: `The file is larger than ${LIMITS.fileBytes} bytes. Shield did not hash it. The name checks above still apply.`,
      severity: "info",
    });
  } else if (bytes) {
    sha256 = await sha256Hex(bytes);
    evidence.push({
      id: "sha256",
      title: "SHA-256 computed locally",
      detail: "The hash was calculated in this browser. It was not sent anywhere. A hash is not a malware scan and was not looked up in a reputation service.",
      severity: "info",
    });
  }
  const indicators = evidence.some((item) => item.severity === "indicator");
  return {
    verdict: indicators ? "suspicious_indicators" : "no_known_match",
    summary: indicators
      ? "The name or the first bytes look misleading. This is not a malware scan."
      : "No double-extension or type mismatch was found. This is not a malware scan and not a clean bill of health.",
    evidence,
    scope: "The file name and, if you selected a file under the size cap, a local SHA-256 and a few magic-byte checks. The file was not uploaded.",
    timestamp: now.toISOString(),
    transmission: "local",
    uncertainty: "NXTL Shield does not run a full malware scanner. Unknown or encrypted files may not be identified from a name or hash alone.",
    fileName: name.split(/[/\\]/).pop() ?? name,
    sha256,
    notAMalwareScan: true,
  };
}
