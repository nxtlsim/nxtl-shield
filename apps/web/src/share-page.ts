import { QRCodeWriter, BarcodeFormat } from "@zxing/library";
import { generatePassword } from "@nxtl/core";
import { field, h, introBlock, faqSection } from "./dom";
import { createIcon } from "./icons";
import { diagramShare } from "./diagrams";
import { copyToClipboard } from "./pages";
import type { ShareJob, ShareOk } from "./share-crypto";

const RELAY_ORIGIN = "https://nxtl-shield-relay.dagys-mantas.workers.dev";
const LIMIT = 25 * 1024 * 1024;
const MAX_CIPHERTEXT_BYTES = 64 * 1024;

function toBuffer(arr: Uint8Array): ArrayBuffer {
  return arr.buffer.slice(arr.byteOffset, arr.byteOffset + arr.byteLength) as ArrayBuffer;
}

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

function toBase64(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function fromBase64(b64: string): Uint8Array {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

function toBase64Url(bytes: Uint8Array): string {
  return toBase64(bytes).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(str: string): Uint8Array {
  let b64 = str.replace(/-/g, "+").replace(/_/g, "/");
  while (b64.length % 4) b64 += "=";
  return fromBase64(b64);
}


async function relayFetch(path: string, init: RequestInit = {}, timeoutMs = 20000): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(`${RELAY_ORIGIN}${path}`, {
      ...init,
      credentials: "omit",
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timer);
  }
}


function generateQrSvg(text: string): string {
  try {
    const writer = new QRCodeWriter();
    const matrix = writer.encode(text, BarcodeFormat.QR_CODE, 0, 0, new Map());
    const size = matrix.getWidth();
    let path = "";
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        if (matrix.get(x, y)) {
          path += `M${x},${y}h1v1h-1z `;
        }
      }
    }
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="200" height="200" fill="currentColor" role="img" aria-label="QR code"><path d="${path}"/></svg>`;
  } catch {
    return "";
  }
}

async function copyText(value: string, status: HTMLElement, box?: HTMLTextAreaElement | HTMLInputElement) {
  try {
    await navigator.clipboard.writeText(value);
    status.textContent = "Copied to clipboard.";
  } catch {
    box?.focus();
    box?.select();
    status.textContent = "clipboard refused: The result is selected — use your device’s copy command.";
  }
}

async function shareOut(status: HTMLElement, title: string, text?: string, file?: { name: string; bytes: Uint8Array }) {
  if (!navigator.share) {
    status.textContent = "Your browser does not support sharing — use Copy or Download instead.";
    return;
  }
  try {
    if (file && navigator.canShare) {
      const blob = new File([new Uint8Array(file.bytes)], file.name, { type: "application/octet-stream" });
      if (navigator.canShare({ files: [blob] })) {
        await navigator.share({ files: [blob], title });
        return;
      }
    }
    if (text) {
      await navigator.share({ title, text });
      return;
    }
    status.textContent = "This browser cannot share that file type. Use Download instead.";
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") return;
    status.textContent = "Share did not complete. Use Copy or Download.";
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
    status.textContent = "Download could not start. Use Copy if the result is text.";
  }
}

async function digest(bytes: Uint8Array): Promise<string> {
  const copy = new Uint8Array(bytes);
  const hash = await crypto.subtle.digest("SHA-256", copy);
  return [...new Uint8Array(hash)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export function pageShare(): HTMLElement {
  const rawHash = location.hash.replace(/^#\/?/, "");
  if (rawHash.startsWith("messages/open/") || rawHash.startsWith("share/open/")) {
    return pageOpenPrivateMessage();
  }

  let mode: "encrypt" | "decrypt" = "encrypt";
  let file: { name: string; bytes: Uint8Array } | null = null;
  let output: ShareOk | null = null;
  let busy = false;

  const root = h("div", { class: "grid" });

  const intro = introBlock({
    what: "Encrypt confidential text messages or files using a password on your device. Anyone with the password and NXTL Shield can decrypt it.",
    howSteps: [
      "Select Encrypt or Decrypt tab.",
      "Type a message or drop a file (up to 25 MB).",
      "Enter a strong shared password (or click Generate).",
      "Click Encrypt, then copy or share the protected result.",
      "Send the password separately, for example in a call or a different chat.",
    ],
    limit: "Encryption happens on this device. If you lose the password, the data cannot be recovered.",
  });

  const header = h("div", {}, [
    h("h1", {}, ["Private messages & files"]),
    h("p", { class: "lede" }, [
      "Encrypt a message or file on this device with a password you choose. Nothing is uploaded. Send the password through a different channel.",
    ]),
  ]);

  // Mode Tabs
  const encryptMode = h("button", { type: "button", "data-mode": "encrypt", "aria-pressed": "true", class: "btn primary" }, [
    createIcon("share-lock", 18),
    "Encrypt",
  ]);
  const decryptMode = h("button", { type: "button", "data-mode": "decrypt", "aria-pressed": "false", class: "btn" }, [
    createIcon("eye", 18),
    "Decrypt",
  ]);

  const tabs = h("div", { class: "tabs", role: "group", "aria-label": "Encryption mode" }, [encryptMode, decryptMode]);

  // Form controls
  const input = h("textarea", {
    "data-testid": "share-input",
    rows: "5",
    placeholder: "Type or paste the confidential message to encrypt...",
  });

  // Visually hidden file input
  const fileInput = h("input", {
    type: "file",
    "data-testid": "share-file",
    class: "sr-only",
    tabindex: "-1",
    "aria-hidden": "true",
  }) as HTMLInputElement;

  const dropZoneContent = h("div", { class: "file-drop-inner" });

  function renderEmptyDropZone() {
    dropZoneContent.replaceChildren(
      h("span", { class: "file-drop-icon" }, [createIcon("file", 36)]),
      h("div", { class: "file-drop-text" }, [
        h("span", { class: "file-drop-title" }, ["Choose a file or drop it here"]),
        h("span", { class: "file-drop-hint" }, ["Up to 25 MB"]),
      ]),
    );
  }

  function renderSelectedFile(name: string, sizeBytes: number) {
    const sizeKb = Math.round(sizeBytes / 1024);
    const sizeStr = sizeKb > 1024 ? `${(sizeKb / 1024).toFixed(1)} MB` : `${sizeKb} KB`;

    const removeBtn = h("button", {
      type: "button",
      class: "btn sm ghost",
      style: "margin-left: auto;",
      "aria-label": "Remove file",
    }, [
      createIcon("close", 14),
      "Remove file",
    ]);

    removeBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      file = null;
      fileInput.value = "";
      renderEmptyDropZone();
      status.textContent = "File removed.";
    });

    dropZoneContent.replaceChildren(
      h("span", { class: "file-drop-icon" }, [createIcon("check", 32)]),
      h("div", { class: "file-drop-text" }, [
        h("span", { class: "file-drop-title" }, [name]),
        h("span", { class: "file-drop-hint" }, [`${sizeStr} · Attached`]),
      ]),
      removeBtn,
    );
  }

  renderEmptyDropZone();

  const fileDropZone = h("div", {
    class: "file-drop",
    tabindex: "0",
    role: "button",
    "aria-label": "Choose a file to attach, up to 25 MB",
  }, [dropZoneContent]);

  fileDropZone.addEventListener("click", () => fileInput.click());
  fileDropZone.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      fileInput.click();
    }
  });

  fileDropZone.addEventListener("dragover", (e) => {
    e.preventDefault();
    fileDropZone.classList.add("dragover");
  });
  fileDropZone.addEventListener("dragleave", () => {
    fileDropZone.classList.remove("dragover");
  });
  fileDropZone.addEventListener("drop", (e) => {
    e.preventDefault();
    fileDropZone.classList.remove("dragover");
    const dropped = e.dataTransfer?.files?.[0];
    if (dropped) handleFile(dropped);
  });

  const password = h("input", {
    type: "password",
    "data-testid": "share-password",
    autocomplete: "off",
    placeholder: "Enter a secret shared password...",
  });

  const armor = h("input", { type: "checkbox" });
  (armor as HTMLInputElement).checked = true;

  const resultBox = h("textarea", {
    "data-testid": "share-output",
    readonly: "true",
    rows: "6",
    class: "mono",
    style: "background: var(--raised); border-color: var(--line-accent);",
  });
  resultBox.hidden = true;

  const status = h("p", {
    class: "banner",
    role: "status",
    "data-testid": "share-status",
    style: "margin: var(--sp-3) 0;",
  }, ["Encrypts only what you type or choose here."]);

  const actions = h("div", { class: "row", style: "margin-top: var(--sp-3); flex-wrap: wrap; gap: var(--sp-2);" });
  const runButton = h("button", { class: "primary lg", type: "button", "data-testid": "share-run" }, [
    createIcon("share-lock", 20),
    "Encrypt message",
  ]);

  function setMode(next: "encrypt" | "decrypt") {
    mode = next;
    runButton.replaceChildren(
      createIcon(next === "encrypt" ? "share-lock" : "eye", 20),
      next === "encrypt" ? "Encrypt message" : "Decrypt message",
    );
    input.placeholder = next === "encrypt" ? "Type or paste the confidential message to encrypt..." : "Paste an encrypted message...";
    encryptMode.setAttribute("aria-pressed", next === "encrypt" ? "true" : "false");
    decryptMode.setAttribute("aria-pressed", next === "decrypt" ? "true" : "false");
    encryptMode.className = `btn ${next === "encrypt" ? "primary" : ""}`;
    decryptMode.className = `btn ${next === "decrypt" ? "primary" : ""}`;
  }

  function handleFile(picked: File) {
    file = null;
    if (picked.size > LIMIT) {
      status.textContent = "This file is larger than 25 MB limit. It was not read.";
      fileInput.value = "";
      renderEmptyDropZone();
      return;
    }
    picked.arrayBuffer().then((buffer) => {
      file = { name: picked.name, bytes: new Uint8Array(buffer) };
      renderSelectedFile(picked.name, picked.size);
      status.textContent = `File ready: ${picked.name} (${Math.round(picked.size / 1024)} KB). The text message box is ignored while a file is attached.`;
    });
  }

  fileInput.addEventListener("change", () => {
    const picked = fileInput.files?.[0];
    if (picked) handleFile(picked);
  });

  const generate = h("button", { type: "button", class: "btn-sm", "data-testid": "share-generate" }, [
    createIcon("password", 16),
    "Generate",
  ]);
  generate.addEventListener("click", () => {
    const created = generatePassword({ length: 20, symbols: true });
    (password as HTMLInputElement).value = created.password;
    (password as HTMLInputElement).type = "text";
    status.textContent = "Password generated on this device. Send it through a separate trusted channel. It is not saved.";
  });

  const reveal = h("button", { type: "button", class: "btn-sm ghost" }, ["Show"]);
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
      if (file) {
        job = { op: "encrypt-file", name: file.name, bytes: file.bytes, password: secret, armor: (armor as HTMLInputElement).checked };
      } else if (input.value.trim()) {
        job = { op: "encrypt-text", text: input.value, password: secret, armor: (armor as HTMLInputElement).checked };
      } else {
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
      const copy = h("button", { type: "button", class: "primary", "data-testid": "share-copy" }, [
        createIcon("copy", 18),
        output.kind === "text" ? "Copy decrypted message" : "Copy encrypted message",
      ]);
      copy.addEventListener("click", () => copyText(output && "text" in output ? output.text : "", status, resultBox));

      const share = h("button", { type: "button", class: "btn", "data-testid": "share-share" }, [
        createIcon("external", 18),
        output.kind === "text" ? "Share decrypted message" : "Share encrypted message",
      ]);
      const text = output.text;
      const label = output.kind === "text" ? "Decrypted message" : "Encrypted message";
      share.addEventListener("click", () => shareOut(status, label, text));

      const trustedChannelNote = h("p", { class: "muted-soft", style: "width: 100%; margin-top: var(--sp-2);" }, [
        "Send the password separately, for example in a call or a different chat.",
      ]);

      actions.append(copy, share, trustedChannelNote);
    } else {
      resultBox.hidden = false;
      const hash = await digest(output.bytes);
      resultBox.value = `${output.filename}\nSHA-256 ${hash}`;

      const save = h("button", { type: "button", class: "primary", "data-testid": "share-download" }, [
        createIcon("download", 18),
        "Download",
      ]);
      const bytes = output.bytes;
      const name = output.filename;
      save.addEventListener("click", () => download(name, bytes, status));

      const share = h("button", { type: "button", class: "btn", "data-testid": "share-share" }, [
        createIcon("external", 18),
        output.kind === "file" ? "Share decrypted file" : "Share encrypted file",
      ]);
      share.addEventListener("click", () => shareOut(status, name, undefined, { name, bytes }));

      const trustedChannelNote = h("p", { class: "muted-soft", style: "width: 100%; margin-top: var(--sp-2);" }, [
        "Send the password separately, for example in a call or a different chat.",
      ]);

      actions.append(save, share, trustedChannelNote);
    }
  }

  runButton.addEventListener("click", () => void execute());

  const clear = h("button", { type: "button", class: "btn ghost", "data-testid": "share-clear" }, [
    createIcon("trash", 16),
    "Clear",
  ]);
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
    fileInput.value = "";
    file = null;
    output = null;
    resultBox.value = "";
    resultBox.hidden = true;
    renderEmptyDropZone();
    actions.replaceChildren();
    armed = false;
    clear.replaceChildren(createIcon("trash", 16), "Clear");
    status.textContent = "Cleared from this page. Nothing was stored.";
  });

  encryptMode.addEventListener("click", () => setMode("encrypt"));
  decryptMode.addEventListener("click", () => setMode("decrypt"));
  setMode("encrypt");

  const advanced = h("details", { class: "advanced-box" }, [
    h("summary", {}, ["Advanced settings"]),
    h("label", { class: "row", style: "margin-top: var(--sp-3);" }, [
      armor,
      " Armored text (easier to copy). Uncheck for raw binary file.",
    ]),
    h("p", { class: "muted-soft", style: "margin-top: var(--sp-2);" }, [
      "Messages and files are encrypted on this device with a password you choose. The password is never sent across the internet.",
    ]),
  ]);

  // Private Link Section
  const privateLinkCard = createPrivateLinkCard(input);

  const formCard = h("div", { class: "card", style: "display: grid; gap: var(--sp-4);" }, [
    tabs,
    field("Confidential text message", input, "Stays in this browser"),
    h("div", { class: "field-wrap" }, [
      h("label", { class: "field" }, [
        h("span", { class: "label-text" }, ["Or attach a file"]),
        fileDropZone,
      ]),
      fileInput,
    ]),
    h("div", {}, [
      field("Shared secret password", password, "Must match exactly to decrypt"),
      h("div", { class: "row", style: "margin-top: var(--sp-2);" }, [generate, reveal]),
    ]),
    h("p", { class: "muted-soft" }, [
      createIcon("info", 16),
      " Send the password separately, for example in a call or a different chat. Never send the password alongside the encrypted message.",
    ]),
    advanced,
    h("div", { class: "row", style: "margin-top: var(--sp-3);" }, [runButton, clear]),
    status,
    resultBox,
    actions,
  ]);

  const faqs = faqSection([
    {
      q: "Can anyone read this without the password?",
      a: "No. It is locked with your password on this device. Nobody can open it without that exact password, including us.",
    },
    {
      q: "Does NXTL see my password or messages?",
      a: "No. A password-protected file or message stays on this device. A private link sends only the locked text, never the key or password, and that locked text is deleted when it is opened.",
    },
    {
      q: "Can I open these files on other computers?",
      a: "Yes. Anyone with NXTL Shield and the password can decrypt it on their own device.",
    },
  ]);

  root.append(header, formCard, privateLinkCard, intro, diagramShare(), faqs);
  return root;
}

// ---------------------------------------------------------------------
// Private Read-Once Link Creation Card
// ---------------------------------------------------------------------
function createPrivateLinkCard(textInput: HTMLTextAreaElement): HTMLElement {
  const card = h("section", { class: "card", style: "margin-top: var(--sp-4); display: grid; gap: var(--sp-3);" });
  const title = h("h2", { style: "margin: 0; font-size: 1.25rem;" }, ["Send a read-once private link"]);
  const lede = h("p", { class: "muted", style: "margin: 0;" }, [
    "Lock a text message so it can only be opened once. This message is gone after you read it.",
  ]);

  const ttlSelect = h("select", { style: "width: auto; min-width: 140px;" }, [
    h("option", { value: "86400" }, ["1 day"]),
    h("option", { value: "3600" }, ["1 hour"]),
    h("option", { value: "604800" }, ["7 days"]),
  ]) as HTMLSelectElement;

  const ttlLabel = h("label", { class: "field", style: "display: flex; align-items: center; gap: var(--sp-3); margin-bottom: 0;" }, [
    h("span", { style: "font-weight: 600;" }, ["Delete after"]),
    ttlSelect,
  ]);

  const passwordCheck = h("input", { type: "checkbox" }) as HTMLInputElement;
  const passwordField = h("input", {
    type: "password",
    placeholder: "Extra secret password...",
    style: "display: none; margin-top: var(--sp-2);",
    autocomplete: "off",
  }) as HTMLInputElement;

  passwordCheck.addEventListener("change", () => {
    passwordField.style.display = passwordCheck.checked ? "block" : "none";
    if (passwordCheck.checked) passwordField.focus();
  });

  const passwordLabel = h("div", {}, [
    h("label", { class: "row", style: "cursor: pointer; user-select: none;" }, [
      passwordCheck,
      " Also require a password",
    ]),
    passwordField,
  ]);

  const status = h("p", { class: "banner alert", style: "display: none; margin: 0;" });
  const resultContainer = h("div", { style: "display: none; margin-top: var(--sp-3);" });

  const createBtn = h("button", {
    type: "button",
    class: "btn primary",
    style: "align-self: flex-start;",
  }, [
    createIcon("share-lock", 18),
    "Create a private link",
  ]);

  createBtn.addEventListener("click", async () => {
    const rawText = textInput.value.trim();
    if (!rawText) {
      status.textContent = "Add a message first.";
      status.style.display = "block";
      return;
    }

    const usePassword = passwordCheck.checked;
    const pwValue = passwordField.value;
    if (usePassword && !pwValue) {
      status.textContent = "Enter a password first.";
      status.style.display = "block";
      return;
    }

    status.style.display = "none";
    createBtn.disabled = true;

    try {
      const enc = new TextEncoder();
      const rawMsgKey = crypto.getRandomValues(new Uint8Array(32));
      const msgKey = await crypto.subtle.importKey("raw", rawMsgKey, "AES-GCM", false, ["encrypt"]);
      const msgIv = crypto.getRandomValues(new Uint8Array(12));
      const innerCipher = await crypto.subtle.encrypt({ name: "AES-GCM", iv: msgIv }, msgKey, enc.encode(rawText));

      let ciphertextB64 = "";
      let fragmentParams = "";

      if (usePassword) {
        const salt = crypto.getRandomValues(new Uint8Array(16));
        const baseKey = await crypto.subtle.importKey("raw", enc.encode(pwValue), "PBKDF2", false, ["deriveKey"]);
        const derivedKey = await crypto.subtle.deriveKey(
          { name: "PBKDF2", salt, iterations: 600000, hash: "SHA-256" },
          baseKey,
          { name: "AES-GCM", length: 256 },
          false,
          ["encrypt"]
        );

        // Inner blob = message key || msgIv || innerCipher (the key stays out of the URL)
        const innerBlob = new Uint8Array(32 + 12 + innerCipher.byteLength);
        innerBlob.set(rawMsgKey, 0);
        innerBlob.set(msgIv, 32);
        innerBlob.set(new Uint8Array(innerCipher), 44);

        const outerIv = crypto.getRandomValues(new Uint8Array(12));
        const outerCipher = await crypto.subtle.encrypt({ name: "AES-GCM", iv: outerIv }, derivedKey, innerBlob);
        const outerBlob = new Uint8Array(12 + outerCipher.byteLength);
        outerBlob.set(outerIv, 0);
        outerBlob.set(new Uint8Array(outerCipher), 12);

        ciphertextB64 = toBase64(outerBlob);
        fragmentParams = `p=1&s=${toBase64Url(salt)}`;
      } else {
        const blob = new Uint8Array(12 + innerCipher.byteLength);
        blob.set(msgIv, 0);
        blob.set(new Uint8Array(innerCipher), 12);
        ciphertextB64 = toBase64(blob);
        fragmentParams = `k=${toBase64Url(rawMsgKey)}`;
      }

      if (ciphertextB64.length > MAX_CIPHERTEXT_BYTES) {
        status.textContent = "This message is too long for a link. Shorten it, or use a password and send the message another way.";
        status.style.display = "block";
        createBtn.disabled = false;
        return;
      }

      const ttl = parseInt(ttlSelect.value, 10) || 86400;
      const resp = await relayFetch("/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ciphertext: ciphertextB64,
          ttl,
          password: usePassword,
        }),
      });

      if (!resp.ok) {
        status.textContent = "Could not reach the message service. Try again in a moment.";
        status.style.display = "block";
        createBtn.disabled = false;
        return;
      }

      const data = await resp.json() as { id: string };
      const linkUrl = `${location.origin}${location.pathname}#/messages/open/${data.id}&${fragmentParams}`;

      showLinkReady(resultContainer, linkUrl);
      resultContainer.style.display = "block";
    } catch {
      status.textContent = "Could not reach the message service. Try again in a moment.";
      status.style.display = "block";
    } finally {
      createBtn.disabled = false;
    }
  });

  card.append(title, lede, ttlLabel, passwordLabel, createBtn, status, resultContainer);
  return card;
}

function showLinkReady(container: HTMLElement, url: string) {
  const resultHeading = h("h3", { style: "margin: 0 0 var(--sp-2); font-size: 1.15rem;" }, ["Private link ready"]);
  const linkInput = h("input", {
    type: "text",
    readonly: "true",
    value: url,
    class: "mono",
    style: "background: var(--raised);",
  }) as HTMLInputElement;

  const copyBtn = h("button", { type: "button", class: "btn primary" }, [
    createIcon("copy", 18),
    "Copy link",
  ]);
  copyBtn.addEventListener("click", async () => {
    await copyToClipboard(url, copyBtn, [createIcon("copy", 18), "Copy link"], "Link copied.");
  });

  const actionsRow = h("div", { class: "row", style: "gap: var(--sp-2); margin-top: var(--sp-3);" }, [copyBtn]);

  if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
    const shareBtn = h("button", { type: "button", class: "btn" }, [
      createIcon("external", 18),
      "Share",
    ]);
    shareBtn.addEventListener("click", async () => {
      try {
        await navigator.share({
          title: "NXTL Shield",
          text: `A private message for you: ${url}`,
          url,
        });
      } catch {
        // User cancelled — stay quiet
      }
    });
    actionsRow.append(shareBtn);
  }

  const qrContainer = h("div", { style: "display: none; margin-top: var(--sp-3); text-align: center;" });
  const qrSvg = generateQrSvg(url);
  qrContainer.innerHTML = `<div style="background: #ffffff; color: #0a0c12; padding: 16px; border-radius: 4px; display: inline-flex;">${qrSvg}</div>`;

  const qrBtn = h("button", { type: "button", class: "btn ghost" }, [
    createIcon("qr", 18),
    "Show QR",
  ]);
  qrBtn.addEventListener("click", () => {
    const visible = qrContainer.style.display !== "none";
    qrContainer.style.display = visible ? "none" : "block";
    qrBtn.replaceChildren(createIcon("qr", 18), visible ? "Show QR" : "Hide QR");
  });
  actionsRow.append(qrBtn);

  const readyNote = h("p", { class: "muted-soft", style: "margin-top: var(--sp-3);" }, [
    "This message is gone after you read it.",
  ]);

  container.replaceChildren(resultHeading, linkInput, actionsRow, qrContainer, readyNote);
}

// ---------------------------------------------------------------------
// Recipient: Open Private Message Screen
// ---------------------------------------------------------------------
function pageOpenPrivateMessage(): HTMLElement {
  const root = h("div", { class: "grid" });
  const header = h("header", { class: "page-header" }, [
    h("h1", {}, ["You have a private message"]),
    h("p", { class: "lede" }, [
      "This message is gone after you read it.",
    ]),
  ]);

  const rawHash = location.hash.replace(/^#\/?/, "");
  // Parse #/messages/open/<id>&params or #/share/open/<id>&params
  const prefixMatch = rawHash.match(/^(?:messages|share)\/open\/([^&?]+)(?:[?&](.*))?$/);
  if (!prefixMatch) {
    return h("div", { class: "card" }, [
      h("p", { class: "banner alert" }, ["Invalid private message link."]),
    ]);
  }

  const messageId = prefixMatch[1];
  const paramsStr = prefixMatch[2] || "";
  const params = new URLSearchParams(paramsStr.replace(/&/g, "&"));

  const keyB64Url = params.get("k");
  const requiresPassword = params.get("p") === "1";
  const saltB64Url = params.get("s");

  const card = h("div", { class: "card", style: "display: grid; gap: var(--sp-4);" });
  const statusBanner = h("div", { class: "banner alert", style: "display: none;" });

  const passwordInput = h("input", {
    type: "password",
    placeholder: "Enter the message password...",
    autocomplete: "off",
  }) as HTMLInputElement;

  if (requiresPassword) {
    card.append(field("Password required", passwordInput, "The sender locked this with a password"));
  }

  const openBtn = h("button", {
    type: "button",
    class: "btn primary lg",
    style: "justify-content: center;",
  }, [
    createIcon("eye", 20),
    "Tap to open",
  ]);

  card.append(openBtn, statusBanner);
  root.append(header, card);

  // Check status proactively
  relayFetch(`/v1/messages/${encodeURIComponent(messageId)}/status`, { method: "GET" })
    .then((resp) => {
      if (resp.status === 404) {
        showAlreadyOpenedOrExpired(card, header);
      }
    })
    .catch(() => {
      // Network check error; let user tap to retry
    });

  let cachedCiphertextB64: string | null = null;

  openBtn.addEventListener("click", async () => {
    statusBanner.style.display = "none";
    if (requiresPassword && !passwordInput.value) {
      statusBanner.textContent = "Enter the password first.";
      statusBanner.style.display = "block";
      return;
    }

    openBtn.disabled = true;

    try {
      let ciphertextB64 = cachedCiphertextB64;
      if (!ciphertextB64) {
        const resp = await relayFetch(`/v1/messages/${encodeURIComponent(messageId)}/open`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
        });

        if (resp.status === 404) {
          showAlreadyOpenedOrExpired(card, header);
          return;
        }

        if (!resp.ok) {
          statusBanner.textContent = "Could not reach the message service. Try again in a moment.";
          statusBanner.style.display = "block";
          openBtn.disabled = false;
          return;
        }

        const data = await resp.json() as { ciphertext: string; password: boolean };
        ciphertextB64 = data.ciphertext;
        cachedCiphertextB64 = data.ciphertext;
      }

      // Decrypt
      let plaintext = "";
      const enc = new TextEncoder();
      const dec = new TextDecoder();

      if (requiresPassword) {
        const pwValue = passwordInput.value;
        const salt = saltB64Url ? fromBase64Url(saltB64Url) : new Uint8Array(16);
        const baseKey = await crypto.subtle.importKey("raw", enc.encode(pwValue), "PBKDF2", false, ["deriveKey"]);
        const derivedKey = await crypto.subtle.deriveKey(
          { name: "PBKDF2", salt: toBuffer(salt), iterations: 600000, hash: "SHA-256" },
          baseKey,
          { name: "AES-GCM", length: 256 },
          false,
          ["decrypt"]
        );

        const outerBlob = fromBase64(ciphertextB64);
        const outerIv = outerBlob.subarray(0, 12);
        const outerCipher = outerBlob.subarray(12);

        let innerBlobArr: Uint8Array;
        try {
          const innerBlob = await crypto.subtle.decrypt({ name: "AES-GCM", iv: toBuffer(outerIv) }, derivedKey, toBuffer(outerCipher));
          innerBlobArr = new Uint8Array(innerBlob);
        } catch {
          statusBanner.textContent = "That password does not match.";
          statusBanner.style.display = "block";
          openBtn.disabled = false;
          return;
        }

        const rawMsgKey = innerBlobArr.subarray(0, 32);
        const msgIv = innerBlobArr.subarray(32, 44);
        const msgCipher = innerBlobArr.subarray(44);
        const msgKey = await crypto.subtle.importKey("raw", toBuffer(rawMsgKey), "AES-GCM", false, ["decrypt"]);
        const decrypted = await crypto.subtle.decrypt({ name: "AES-GCM", iv: toBuffer(msgIv) }, msgKey, toBuffer(msgCipher));
        plaintext = dec.decode(decrypted);
      } else {
        const blob = fromBase64(ciphertextB64);
        const iv = blob.subarray(0, 12);
        const cipher = blob.subarray(12);
        const rawKey = keyB64Url ? fromBase64Url(keyB64Url) : new Uint8Array(32);
        const key = await crypto.subtle.importKey("raw", toBuffer(rawKey), "AES-GCM", false, ["decrypt"]);
        const decrypted = await crypto.subtle.decrypt({ name: "AES-GCM", iv: toBuffer(iv) }, key, toBuffer(cipher));
        plaintext = dec.decode(decrypted);
      }

      // Decrypt succeeded! Clear key/salt from address bar
      history.replaceState({ shield: true }, "", `${location.pathname}#/messages`);

      // Show decrypted message
      showOpenedMessage(card, header, plaintext);
    } catch {
      statusBanner.textContent = "Could not reach the message service. Try again in a moment.";
      statusBanner.style.display = "block";
      openBtn.disabled = false;
    }
  });

  return root;
}

function showAlreadyOpenedOrExpired(card: HTMLElement, header: HTMLElement) {
  header.replaceChildren(
    h("h1", {}, ["Message unavailable"]),
  );
  card.replaceChildren(
    h("p", { class: "banner neutral", style: "font-size: 1.05rem;" }, [
      "This message was already opened or has expired.",
    ]),
    h("a", { class: "btn primary", href: "#/messages", style: "justify-content: center;" }, [
      "Send a private message",
    ]),
  );
}

function showOpenedMessage(card: HTMLElement, header: HTMLElement, text: string) {
  header.replaceChildren(
    h("h1", {}, ["Private message"]),
    h("p", { class: "lede" }, ["This message is gone after you read it."]),
  );

  const textBox = h("textarea", {
    readonly: "true",
    rows: "6",
    class: "mono",
    style: "background: var(--raised); border-color: var(--line-accent);",
  }, [text]) as HTMLTextAreaElement;
  textBox.value = text;

  const copyBtn = h("button", { type: "button", class: "btn primary" }, [
    createIcon("copy", 18),
    "Copy message",
  ]);
  const status = h("p", { class: "banner ok", style: "display: none;" });

  copyBtn.addEventListener("click", async () => {
    await copyText(text, status, textBox);
    status.style.display = "block";
  });

  const actions = h("div", { class: "row", style: "gap: var(--sp-2);" }, [copyBtn]);

  const note = h("p", { class: "muted-soft", style: "margin: 0;" }, [
    "This message is gone after you read it.",
  ]);

  card.replaceChildren(textBox, actions, status, note);
}
