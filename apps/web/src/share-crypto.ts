import * as openpgp from "openpgp";

/** 25 MB. Enforced before encryption so a phone does not sit on a multi-hundred-megabyte Argon2 job. */
export const SHARE_BYTE_LIMIT = 25 * 1024 * 1024;

export const SHARE_PROFILE = {
  library: "openpgp",
  version: "6.3.2",
  licence: "LGPL-3.0-or-later",
  licenceUrl: "https://github.com/openpgpjs/openpgpjs/blob/main/LICENSE",
  advisory:
    "Signature-spoofing fixes through 6.1.1 are included in 6.3.2. Snyk listed no known vulnerabilities in 6.3.2 on 2026-11-09 (https://security.snyk.io/package/npm/openpgp). Checked against https://github.com/openpgpjs/openpgpjs/security/advisories.",
  packet: "SEIPDv2 (RFC 9580 AEAD). Not SEIPDv1.",
  aead: "OCB",
  cipher: "AES-256",
  s2k: "Argon2",
  choice:
    "OpenPGP.js leaves AEAD behind config.aeadProtect and defaults the AEAD algorithm to GCM. Shield sets aeadProtect and selects OCB, which the OpenPGP.js documentation describes as supported across RFC 9580 implementations. Argon2 is the password-stretching (S2K) algorithm. GnuPG 2.4.4 rejects these messages with “packet(3) with unknown version 6”. A SEIPDv1 iterated-S2K message would interoperate with that GnuPG, and Shield does not write those, because they are not AEAD.",
} as const;

const config = {
  aeadProtect: true,
  preferredAEADAlgorithm: openpgp.enums.aead.ocb,
  preferredSymmetricAlgorithm: openpgp.enums.symmetric.aes256,
  s2kType: openpgp.enums.s2k.argon2,
};

export type ShareJob =
  | { op: "encrypt-text"; text: string; password: string; armor: boolean }
  | { op: "encrypt-file"; name: string; bytes: Uint8Array; password: string; armor: boolean }
  | { op: "decrypt"; armored?: string; bytes?: Uint8Array; password: string };

export type ShareOk =
  | { kind: "armored"; text: string }
  | { kind: "binary"; bytes: Uint8Array; filename: string }
  | { kind: "text"; text: string }
  | { kind: "file"; bytes: Uint8Array; filename: string };

export function shareError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  if (/session key decryption failed/i.test(message)) return "That password did not decrypt this message.";
  if (/authentication tag mismatch|modification|integrity/i.test(message)) {
    return "The encrypted data failed its integrity check. It was changed, or it is incomplete.";
  }
  if (/misformed|parsing|armor|not conform|invalid|unknown/i.test(message)) {
    return "This is not a password-encrypted OpenPGP message Shield can read.";
  }
  if (/larger than 25/i.test(message)) return message;
  return "Shield could not finish that operation. Nothing was uploaded.";
}

function assertSize(bytes: number) {
  if (bytes > SHARE_BYTE_LIMIT) throw new Error("This file is larger than 25 MB. Shield did not encrypt or decrypt it.");
}

export async function runShare(job: ShareJob): Promise<ShareOk> {
  if (!job.password) throw new Error("Enter the shared password first.");
  if (job.op === "encrypt-text") {
    if (!job.text) throw new Error("Add a message first.");
    assertSize(new TextEncoder().encode(job.text).byteLength);
    const message = await openpgp.createMessage({ text: job.text });
    const encrypted = await openpgp.encrypt({ message, passwords: [job.password], format: job.armor ? "armored" : "binary", config });
    if (job.armor) return { kind: "armored", text: String(encrypted) };
    return { kind: "binary", bytes: new Uint8Array(encrypted as Uint8Array), filename: "message.pgp" };
  }
  if (job.op === "encrypt-file") {
    assertSize(job.bytes.byteLength);
    const message = await openpgp.createMessage({ binary: job.bytes, filename: job.name || "file" });
    const encrypted = await openpgp.encrypt({ message, passwords: [job.password], format: job.armor ? "armored" : "binary", config });
    const base = (job.name || "file").replace(/[^\w.\- ]+/g, "_");
    if (job.armor) return { kind: "armored", text: String(encrypted) };
    return { kind: "binary", bytes: new Uint8Array(encrypted as Uint8Array), filename: `${base}.pgp` };
  }
  const message = job.armored
    ? await openpgp.readMessage({ armoredMessage: job.armored })
    : await openpgp.readMessage({ binaryMessage: job.bytes ?? new Uint8Array() });
  const decrypted = await openpgp.decrypt({ message, passwords: [job.password], format: "binary" });
  const bytes = new Uint8Array(decrypted.data as Uint8Array);
  assertSize(bytes.byteLength);
  if (decrypted.filename) return { kind: "file", bytes, filename: String(decrypted.filename) };
  return { kind: "text", text: new TextDecoder().decode(bytes) };
}
