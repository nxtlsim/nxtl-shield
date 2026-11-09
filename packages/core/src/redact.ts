const SENSITIVE_KEY = /token|sig|signature|password|secret|key|auth|credential|jwt/i;

/** Redact userinfo and sensitive query values without throwing on junk. */
export function redactRaw(input: string, max = 500): string {
  let s = input.length > max ? `${input.slice(0, max)}…` : input;
  s = s.replace(/\/\/([^/?#\s@]{0,80}):([^/?#\s@]{1,200})@/g, "//***:***@");
  s = s.replace(/\/\/([^/?#\s@]{1,200})@/g, "//***@");
  s = s.replace(
    /([?&][^=&#\s]*?(?:token|sig|signature|password|secret|key|auth|credential|jwt)[^=&#\s]*=)[^&#\s]*/gi,
    "$1***",
  );
  return s;
}

export function redactSecrets(text: string, secrets: string[]): string {
  let out = text;
  for (const secret of secrets) {
    if (secret.length < 4) continue;
    out = out.split(secret).join("***");
  }
  return out;
}

export function sensitiveKey(name: string): boolean {
  return SENSITIVE_KEY.test(name);
}
