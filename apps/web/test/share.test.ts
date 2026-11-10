import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { SHARE_BYTE_LIMIT, runShare } from "../src/share-crypto";

const configNote = "packet(3) with unknown version 6";

describe("Private messages & files", () => {
  it("round-trips text and a file", async () => {
    const encrypted = await runShare({ op: "encrypt-text", text: "Café\nline 2", password: "correct horse", armor: true });
    expect(encrypted.kind).toBe("armored");
    if (encrypted.kind !== "armored") return;
    const decrypted = await runShare({ op: "decrypt", armored: encrypted.text, password: "correct horse" });
    expect(decrypted).toMatchObject({ kind: "text", text: "Café\nline 2" });

    const bytes = new Uint8Array([0, 1, 2, 255, 10, 13]);
    const file = await runShare({ op: "encrypt-file", name: "note.bin", bytes, password: "correct horse", armor: false });
    expect(file.kind).toBe("binary");
    if (file.kind !== "binary") return;
    const back = await runShare({ op: "decrypt", bytes: file.bytes, password: "correct horse" });
    expect(back.kind).toBe("file");
    if (back.kind !== "file") return;
    expect([...back.bytes]).toEqual([...bytes]);
  });

  it("rejects a wrong password, a tampered message, garbage, and an oversized file", async () => {
    const encrypted = await runShare({ op: "encrypt-text", text: "hello", password: "correct horse", armor: true });
    if (encrypted.kind !== "armored") throw new Error("expected armor");
    await expect(runShare({ op: "decrypt", armored: encrypted.text, password: "nope" })).rejects.toThrow(/password/i);
    const binary = await runShare({ op: "encrypt-file", name: "a.bin", bytes: new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8]), password: "correct horse", armor: false });
    if (binary.kind !== "binary") throw new Error("expected binary");
    const flipped = new Uint8Array(binary.bytes);
    flipped[flipped.length - 5] ^= 0xff;
    await expect(runShare({ op: "decrypt", bytes: flipped, password: "correct horse" })).rejects.toThrow(/integrity/i);
    await expect(runShare({ op: "decrypt", armored: "not a message", password: "correct horse" })).rejects.toThrow(/not a password-encrypted/i);
    await expect(
      runShare({ op: "encrypt-file", name: "big.bin", bytes: new Uint8Array(SHARE_BYTE_LIMIT + 1), password: "correct horse", armor: false }),
    ).rejects.toThrow(/25 MB/);
  });

  it("cannot be opened by GnuPG 2.4 and can open a GnuPG 2.4 passphrase message", async () => {
    const encrypted = await runShare({ op: "encrypt-text", text: "hello from shield", password: "test-secret-1", armor: true });
    if (encrypted.kind !== "armored") throw new Error("expected armor");
    const dir = mkdtempSync(join(tmpdir(), "nxtl-gpg-"));
    const file = join(dir, "shield.asc");
    writeFileSync(file, encrypted.text);
    let stderr = "";
    try {
      execFileSync("gpg", ["--batch", "--pinentry-mode", "loopback", "--passphrase", "test-secret-1", "-d", file], { encoding: "utf8" });
    } catch (error) {
      stderr = String((error as { stderr?: string }).stderr ?? "");
    }
    expect(stderr).toContain(configNote);

    const plain = join(dir, "plain.txt");
    writeFileSync(plain, "hello from gpg\n");
    const gpgOut = join(dir, "gpg.asc");
    execFileSync("gpg", ["--batch", "--yes", "--pinentry-mode", "loopback", "--passphrase", "test-secret-1", "--symmetric", "--cipher-algo", "AES256", "--armor", "-o", gpgOut, plain]);
    const opened = await runShare({ op: "decrypt", armored: readFileSync(gpgOut, "utf8"), password: "test-secret-1" });
    expect(opened.kind === "text" ? opened.text : new TextDecoder().decode(opened.kind === "file" ? opened.bytes : new Uint8Array())).toContain("hello from gpg");
  });
});
