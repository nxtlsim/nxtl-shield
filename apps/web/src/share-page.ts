import { generatePassword } from "@nxtl/core";
import { field, h } from "./dom";
import type { ShareJob, ShareOk } from "./share-crypto";

const LIMIT = 25 * 1024 * 1024;
let worker: Worker | null = null;
let seq = 0;

function cryptoWorker(): Worker {
  if (!worker) worker = new Worker(new URL("./share-worker.ts", import.meta.url), { type: "module" });
  return worker;
}

function run(job: ShareJob): Promise<ShareOk> {
  const id = ++seq;
  const current = cryptoWorker();
  return new Promise((resolve, reject) => {
    const onMessage = (event: MessageEvent<{ id: number; ok: boolean; result?: ShareOk; message?: string }>) => {
      if (event.data.id !== id) return;
      current.removeEventListener("message", onMessage);
      if (event.data.ok && event.data.result) resolve(event.data.result);
      else reject(new Error(event.data.message || "Shield could not finish that operation."));
    };
    current.addEventListener("message", onMessage);
    current.postMessage({ id, job });
  });
}

async function copyText(value: string, status: HTMLElement, box?: HTMLTextAreaElement) {
  try {
    await navigator.clipboard.writeText(value);
    status.textContent = "Copied.";
  } catch {
    box?.focus();
    box?.select();
    status.textContent = "The clipboard refused the copy. The result is selected — use your device’s copy command.";
  }
}

async function shareOut(status: HTMLElement, title: string, text?: string, file?: { name: string; bytes: Uint8Array }) {
  if (!navigator.share) {
    status.textContent = "This browser has no share sheet. Use Copy or Download.";
    return;
  }
  try {
    if (file && navigator.canShare) {
      const blob = new File([new Uint8Array(file.bytes)], file.name, { type: "application/octet-stream" });
      if (navigator.canShare({ files: [blob] })) {
        await navigator.share({ files: [blob], title });
        status.textContent = "Share sheet finished.";
        return;
      }
    }
    if (text) {
      await navigator.share({ title, text });
      status.textContent = "Share sheet finished.";
      return;
    }
    status.textContent = "This browser cannot share that file. Use Download.";
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") return;
    status.textContent = "Share did not finish. Use Copy or Download.";
  }
}

function download(name: string, bytes: Uint8Array, status: HTMLElement) {
  try {
    const url = URL.createObjectURL(new Blob([new Uint8Array(bytes)]));
    const anchor = h("a", { href: url, download: name }, ["download"]);
    anchor.click();
    URL.revokeObjectURL(url);
    status.textContent = "Download started.";
  } catch {
    status.textContent = "Download did not start. Use Copy if the result is text.";
  }
}

async function digest(bytes: Uint8Array): Promise<string> {
  const copy = new Uint8Array(bytes);
  const hash = await crypto.subtle.digest("SHA-256", copy);
  return [...new Uint8Array(hash)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export function pageShare(): HTMLElement {
  let mode: "encrypt" | "decrypt" = "encrypt";
  let file: { name: string; bytes: Uint8Array } | null = null;
  let output: ShareOk | null = null;
  let busy = false;

  const status = h("p", { class: "muted", role: "status", "data-testid": "share-status" }, ["Encrypts only what you type or choose here."]);
  const input = h("textarea", { "data-testid": "share-input", rows: "6" });
  input.placeholder = "Message to encrypt";
  const password = h("input", { type: "password", "data-testid": "share-password", autocomplete: "off" });
  password.placeholder = "Shared password";
  const armor = h("input", { type: "checkbox" });
  (armor as HTMLInputElement).checked = true;
  const fileInput = h("input", { type: "file", "data-testid": "share-file" });
  const resultBox = h("textarea", { "data-testid": "share-output", readonly: "true", rows: "6" });
  resultBox.hidden = true;
  const actions = h("div", { class: "row" });
  const runButton = h("button", { class: "primary", type: "button", "data-testid": "share-run" }, ["Encrypt"]);

  function setMode(next: "encrypt" | "decrypt") {
    mode = next;
    runButton.textContent = next === "encrypt" ? "Encrypt" : "Decrypt";
    input.placeholder = next === "encrypt" ? "Message to encrypt" : "Paste an encrypted message";
    for (const button of root.querySelectorAll<HTMLButtonElement>("[data-mode]")) {
      button.setAttribute("aria-pressed", button.dataset.mode === next ? "true" : "false");
    }
  }

  fileInput.addEventListener("change", () => {
    const picked = (fileInput as HTMLInputElement).files?.[0];
    file = null;
    if (!picked) {
      status.textContent = "No file selected.";
      return;
    }
    if (picked.size > LIMIT) {
      status.textContent = "This file is larger than 25 MB. It was not read.";
      (fileInput as HTMLInputElement).value = "";
      return;
    }
    picked.arrayBuffer().then((buffer) => {
      file = { name: picked.name, bytes: new Uint8Array(buffer) };
      status.textContent = `File ready: ${picked.name}. The message box is ignored while a file is selected.`;
    });
  });

  const generate = h("button", { type: "button", "data-testid": "share-generate" }, ["Generate"]);
  generate.addEventListener("click", () => {
    const created = generatePassword({ length: 20, symbols: true });
    (password as HTMLInputElement).value = created.password;
    (password as HTMLInputElement).type = "text";
    status.textContent = "Password generated on this device. Send it through a separate trusted channel. It is not saved.";
  });
  const reveal = h("button", { type: "button" }, ["Show"]);
  reveal.addEventListener("click", () => {
    const field = password as HTMLInputElement;
    const hidden = field.type === "password";
    field.type = hidden ? "text" : "password";
    reveal.textContent = hidden ? "Hide" : "Show";
  });

  async function execute() {
    if (busy) return;
    const secret = (password as HTMLInputElement).value;
    if (!secret) {
      status.textContent = "Enter a shared password first.";
      return;
    }
    let job: ShareJob;
    if (mode === "encrypt") {
      if (file) job = { op: "encrypt-file", name: file.name, bytes: file.bytes, password: secret, armor: (armor as HTMLInputElement).checked };
      else if (input.value.trim()) job = { op: "encrypt-text", text: input.value, password: secret, armor: (armor as HTMLInputElement).checked };
      else {
        status.textContent = "Add a message or choose a file first.";
        return;
      }
    } else if (file) {
      job = { op: "decrypt", bytes: file.bytes, password: secret };
    } else if (input.value.trim()) {
      job = { op: "decrypt", armored: input.value, password: secret };
    } else {
      status.textContent = "Paste an encrypted message or choose its file.";
      return;
    }
    busy = true;
    runButton.disabled = true;
    status.textContent = mode === "encrypt" ? "Encrypting on this device…" : "Decrypting on this device…";
    try {
      output = await run(job);
      await showOutput();
      status.textContent = mode === "encrypt" ? "Encrypted on this device. Send the password separately." : "Decrypted on this device.";
    } catch (error) {
      output = null;
      resultBox.hidden = true;
      actions.replaceChildren();
      status.textContent = error instanceof Error ? error.message : "Shield could not finish that operation.";
    } finally {
      busy = false;
      runButton.disabled = false;
    }
  }

  async function showOutput() {
    actions.replaceChildren();
    if (!output) return;
    if (output.kind === "armored" || output.kind === "text") {
      resultBox.hidden = false;
      resultBox.value = output.text;
      const copy = h("button", { type: "button", "data-testid": "share-copy" }, [output.kind === "text" ? "Copy decrypted message" : "Copy encrypted message"]);
      copy.addEventListener("click", () => copyText(output && "text" in output ? output.text : "", status, resultBox));
      const share = h("button", { type: "button", "data-testid": "share-share" }, [output.kind === "text" ? "Share decrypted message" : "Share encrypted message"]);
      const text = output.text;
      const label = output.kind === "text" ? "Decrypted message" : "Encrypted message";
      share.addEventListener("click", () => shareOut(status, label, text));
      actions.append(copy, share);
    } else {
      resultBox.hidden = false;
      const hash = await digest(output.bytes);
      resultBox.value = `${output.filename}\nSHA-256 ${hash}`;
      const save = h("button", { type: "button", "data-testid": "share-download" }, ["Download"]);
      const bytes = output.bytes;
      const name = output.filename;
      save.addEventListener("click", () => download(name, bytes, status));
      const share = h("button", { type: "button", "data-testid": "share-share" }, [output.kind === "file" ? "Share decrypted file" : "Share encrypted file"]);
      share.addEventListener("click", () => shareOut(status, name, undefined, { name, bytes }));
      actions.append(save, share);
    }
  }

  runButton.addEventListener("click", () => void execute());
  const clear = h("button", { type: "button", "data-testid": "share-clear" }, ["Clear"]);
  let armed = false;
  clear.addEventListener("click", () => {
    if (!armed) {
      armed = true;
      clear.textContent = "Confirm clear";
      status.textContent = "Clear removes the message, file, password, and result from this page.";
      return;
    }
    input.value = "";
    (password as HTMLInputElement).value = "";
    (fileInput as HTMLInputElement).value = "";
    file = null;
    output = null;
    resultBox.value = "";
    resultBox.hidden = true;
    actions.replaceChildren();
    armed = false;
    clear.textContent = "Clear";
    status.textContent = "Cleared from this page. Nothing was stored.";
  });

  const encryptMode = h("button", { type: "button", "data-mode": "encrypt", "aria-pressed": "true" }, ["Encrypt"]);
  const decryptMode = h("button", { type: "button", "data-mode": "decrypt", "aria-pressed": "false" }, ["Decrypt"]);
  encryptMode.addEventListener("click", () => setMode("encrypt"));
  decryptMode.addEventListener("click", () => setMode("decrypt"));

  const root = h("div", { class: "grid" }, [
    h("h1", {}, ["Secure Share"]),
    h("p", { class: "lede" }, [
      "Encrypt or decrypt a message or file on this device. This protects only what you enter here. It does not encrypt chats in other apps.",
    ]),
    h("div", { class: "tabs", role: "group", "aria-label": "Mode" }, [encryptMode, decryptMode]),
    field("Message", input),
    field("Or a file, up to 25 MB", fileInput),
    field("Shared password", password),
    h("div", { class: "row" }, [generate, reveal]),
    h("p", { class: "muted" }, ["Send the password through a separate trusted channel. It is not included in the encrypted result."]),
    h("details", {}, [
      h("summary", {}, ["Advanced"]),
      h("label", { class: "row" }, [armor, " Armored text (easier to copy). Uncheck for a binary .pgp file."]),
      h("p", { class: "muted" }, [
        "Shield writes OpenPGP SEIPDv2 with AES-256-OCB and Argon2. GnuPG 2.4 cannot open those messages. Shield can open passphrase messages created by GnuPG 2.4.",
      ]),
    ]),
    h("div", { class: "row" }, [runButton, clear]),
    status,
    resultBox,
    actions,
  ]);
  return root;
}
