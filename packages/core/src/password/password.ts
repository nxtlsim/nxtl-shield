import { wordlist } from "@scure/bip39/wordlists/english.js";
import { ZxcvbnFactory } from "@zxcvbn-ts/core";
import { adjacencyGraphs, dictionary as commonDictionary } from "@zxcvbn-ts/language-common";
import { dictionary as englishDictionary, translations } from "@zxcvbn-ts/language-en";

const strengthChecker = new ZxcvbnFactory({
  dictionary: { ...commonDictionary, ...englishDictionary },
  graphs: adjacencyGraphs,
  translations,
});

const LOWER = "abcdefghijkmnopqrstuvwxyz";
const LOWER_ALL = "abcdefghijklmnopqrstuvwxyz";
const UPPER = "ABCDEFGHJKLMNPQRSTUVWXYZ";
const UPPER_ALL = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
const DIGITS = "23456789";
const DIGITS_ALL = "0123456789";
const SYMBOLS = "!@#$%^&*()-_=+[]{}:,.?";

export interface PasswordOptions {
  length?: number;
  lower?: boolean;
  upper?: boolean;
  digits?: boolean;
  symbols?: boolean;
  avoidAmbiguous?: boolean;
}

export interface GeneratedPassword {
  password: string;
  length: number;
  classes: string[];
  note: string;
}

export interface GeneratedPassphrase {
  passphrase: string;
  words: number;
  wordlistSize: number;
  bits: number;
  note: string;
}

function randInt(max: number): number {
  if (max <= 1 || max > 0x1_0000_0000) throw new Error("bad range");
  const buf = new Uint32Array(1);
  const limit = Math.floor(0x1_0000_0000 / max) * max;
  let value = 0;
  do {
    crypto.getRandomValues(buf);
    value = buf[0] ?? 0;
  } while (value >= limit);
  return value % max;
}

function shuffle(chars: string[]): string[] {
  const out = chars.slice();
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = randInt(i + 1);
    const tmp = out[i]!;
    out[i] = out[j]!;
    out[j] = tmp;
  }
  return out;
}

export function generatePassword(options: PasswordOptions = {}): GeneratedPassword {
  const length = options.length ?? 20;
  if (!Number.isInteger(length) || length < 12 || length > 64) {
    throw new Error("Password length must be an integer from 12 to 64.");
  }
  const avoid = options.avoidAmbiguous !== false;
  const sets: { name: string; chars: string }[] = [];
  if (options.lower !== false) sets.push({ name: "lower", chars: avoid ? LOWER : LOWER_ALL });
  if (options.upper !== false) sets.push({ name: "upper", chars: avoid ? UPPER : UPPER_ALL });
  if (options.digits !== false) sets.push({ name: "digits", chars: avoid ? DIGITS : DIGITS_ALL });
  if (options.symbols) sets.push({ name: "symbols", chars: SYMBOLS });
  if (!sets.length) throw new Error("Select at least one character set.");
  const alphabet = sets.map((set) => set.chars).join("");
  const chars: string[] = [];
  for (const set of sets) chars.push(set.chars[randInt(set.chars.length)]!);
  while (chars.length < length) chars.push(alphabet[randInt(alphabet.length)]!);
  return {
    password: shuffle(chars).join(""),
    length,
    classes: sets.map((set) => set.name),
    note: "Made on your device. Never stored or sent.",
  };
}

export function generatePassphrase(wordCount = 6): GeneratedPassphrase {
  if (!Number.isInteger(wordCount) || wordCount < 4 || wordCount > 12) {
    throw new Error("Choose 4 to 12 words.");
  }
  const words: string[] = [];
  for (let i = 0; i < wordCount; i += 1) words.push(wordlist[randInt(wordlist.length)]!);
  const bits = Math.round(wordCount * Math.log2(wordlist.length));
  return {
    passphrase: words.join("-"),
    words: wordCount,
    wordlistSize: wordlist.length,
    bits,
    note: "Generated on your device. This is not a cryptocurrency recovery phrase.",
  };
}

export interface Strength {
  score: number;
  guessesLabel: string;
  warning: string;
  suggestions: string[];
  note: string;
}

export function passwordStrength(password: string): Strength {
  if (password.length > LIMIT_PASSWORD) {
    return {
      score: 0,
      guessesLabel: "not estimated",
      warning: "Password exceeds 128 characters.",
      suggestions: [],
      note: "Evaluated locally on your device.",
    };
  }
  const result = strengthChecker.check(password);
  return {
    score: result.score,
    guessesLabel: result.crackTimes.offlineSlowHashingXPerSecond.display,
    warning: result.feedback.warning ?? "",
    suggestions: result.feedback.suggestions ?? [],
    note: "Evaluated locally on your device.",
  };
}

const LIMIT_PASSWORD = 128;

export interface HibpRequest {
  url: string;
  prefix: string;
  suffix: string;
  headers: Record<string, string>;
}

function sha1HexSync(password: string): Promise<string> {
  const data = new TextEncoder().encode(password);
  return crypto.subtle.digest("SHA-1", data).then((buf) =>
    [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("").toUpperCase(),
  );
}

export async function buildHibpRequest(password: string): Promise<HibpRequest> {
  if (!password || password.length > LIMIT_PASSWORD) throw new Error("Password is empty or longer than 128 characters.");
  const hash = await sha1HexSync(password);
  const prefix = hash.slice(0, 5);
  const suffix = hash.slice(5);
  return {
    url: `https://api.pwnedpasswords.com/range/${prefix}`,
    prefix,
    suffix,
    headers: {
      "Add-Padding": "true",
      "User-Agent": "NXTL-Shield-Password-Check",
    },
  };
}

export interface HibpResult {
  status: "match" | "no_known_match" | "unavailable";
  count: number | null;
  prefix: string;
  suffixSent: false;
  requestUrl: string;
  paddedLines: number | null;
  summary: string;
  transmission: "third_party";
  scope: string;
}

export function interpretHibpBody(body: string, suffix: string): { count: number; lines: number } {
  let count = 0;
  let lines = 0;
  const target = suffix.toUpperCase();
  for (const line of body.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    lines += 1;
    const [hashSuffix, times] = trimmed.split(":");
    if (hashSuffix?.toUpperCase() === target) count = Number.parseInt(times ?? "0", 10) || 0;
  }
  return { count, lines };
}

export async function hibpLookup(password: string, fetchImpl: typeof fetch = fetch): Promise<HibpResult> {
  const request = await buildHibpRequest(password);
  const scope = "Have I Been Pwned Pwned Passwords range API. Only the first 5 hex characters of the SHA-1 hash are sent. The password and the rest of the hash stay in this browser.";
  try {
    const response = await fetchImpl(request.url, { method: "GET", headers: request.headers });
    if (!response.ok) {
      return {
        status: "unavailable",
        count: null,
        prefix: request.prefix,
        suffixSent: false,
        requestUrl: request.url,
        paddedLines: null,
        summary: `The range API returned HTTP ${response.status}. No breach result is available.`,
        transmission: "third_party",
        scope,
      };
    }
    const body = await response.text();
    const parsed = interpretHibpBody(body, request.suffix);
    if (parsed.count > 0) {
      return {
        status: "match",
        count: parsed.count,
        prefix: request.prefix,
        suffixSent: false,
        requestUrl: request.url,
        paddedLines: parsed.lines,
        summary: "Found in leaks, don't use it.",
        transmission: "third_party",
        scope,
      };
    }
    return {
      status: "no_known_match",
      count: 0,
      prefix: request.prefix,
      suffixSent: false,
      requestUrl: request.url,
      paddedLines: parsed.lines,
      summary: "Not found in known leaks.",
      transmission: "third_party",
      scope,
    };
  } catch {
    return {
      status: "unavailable",
      count: null,
      prefix: request.prefix,
      suffixSent: false,
      requestUrl: request.url,
      paddedLines: null,
      summary: "Breach lookup unavailable. Please try again later.",
      transmission: "third_party",
      scope,
    };
  }
}
