/** Heuristic only. A hit is not proof of phishing. */
export const BRAND_DOMAINS: Record<string, readonly string[]> = {
  paypal: ["paypal.com", "paypal.me"],
  apple: ["apple.com", "icloud.com"],
  icloud: ["icloud.com", "apple.com"],
  google: ["google.com", "google.co.uk", "google.de", "gmail.com", "youtube.com"],
  gmail: ["gmail.com", "google.com"],
  microsoft: ["microsoft.com", "live.com", "office.com", "outlook.com", "microsoftonline.com"],
  outlook: ["outlook.com", "office.com", "microsoft.com"],
  amazon: ["amazon.com", "amazon.co.uk", "amazon.de"],
  nxtl: ["nxtlsim.com"],
  instagram: ["instagram.com"],
  facebook: ["facebook.com", "fb.com"],
  whatsapp: ["whatsapp.com"],
  netflix: ["netflix.com"],
  dhl: ["dhl.com"],
  fedex: ["fedex.com"],
};

const CONFUSABLES: Record<string, string> = {
  а: "a",
  е: "e",
  о: "o",
  р: "p",
  с: "c",
  у: "y",
  х: "x",
  і: "i",
  ї: "i",
  ј: "j",
  ѕ: "s",
  һ: "h",
  ɡ: "g",
  А: "a",
  Е: "e",
  О: "o",
  Р: "p",
  С: "c",
  Х: "x",
  Ι: "i",
  Ϊ: "i",
  α: "a",
  ο: "o",
  ρ: "p",
  τ: "t",
  ν: "v",
  "０": "0",
  "１": "1",
  "２": "2",
  "３": "3",
  "４": "4",
  "５": "5",
  "６": "6",
  "７": "7",
  "８": "8",
  "９": "9",
};

export function skeletonLabel(label: string): { skeleton: string; changed: boolean } {
  let changed = false;
  let out = "";
  for (const ch of label.normalize("NFKC")) {
    const mapped = CONFUSABLES[ch];
    if (mapped) {
      changed = true;
      out += mapped;
    } else {
      out += ch.toLowerCase();
    }
  }
  return { skeleton: out, changed };
}

export type ScriptName = "latin" | "cyrillic" | "greek" | "other";

export function scriptOf(char: string): ScriptName | "ignore" {
  const code = char.codePointAt(0) ?? 0;
  if (/[0-9._-]/.test(char)) return "ignore";
  if (code <= 0x7f) return /[a-z]/i.test(char) ? "latin" : "ignore";
  if (code >= 0x0400 && code <= 0x04ff) return "cyrillic";
  if (code >= 0x0370 && code <= 0x03ff) return "greek";
  if (code >= 0xff00 && code <= 0xffef) return "latin";
  return "other";
}

export function mixedScripts(label: string): ScriptName[] {
  const found = new Set<ScriptName>();
  for (const ch of label) {
    const script = scriptOf(ch);
    if (script !== "ignore") found.add(script);
  }
  return [...found];
}
