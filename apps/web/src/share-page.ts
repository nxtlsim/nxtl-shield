import { generatePassword } from "@nxtl/core";
import { field, h, introBlock, faqSection } from "./dom";
import { createIcon } from "./icons";
import { diagramShare } from "./diagrams";
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
        status.textContent = "Shared successfully.";
        return;
      }
    }
    if (text) {
      await navigator.share({ title, text });
      status.textContent = "Shared successfully.";
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
      "Encrypt and decrypt confidential text messages and files right in your browser. The password never leaves this device.",
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
      a: "Never. Encryption and decryption run entirely in this browser on your device. Nothing is sent to any server.",
    },
    {
      q: "Can I open these files on other computers?",
      a: "Yes. Anyone with NXTL Shield and the password can decrypt it on their own device.",
    },
  ]);

  root.append(header, formCard, intro, diagramShare(), faqs);
  return root;
}
