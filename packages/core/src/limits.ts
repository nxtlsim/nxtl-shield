export const LIMITS = {
  url: 8_192,
  text: 100_000,
  fileName: 1_024,
  /** Local hash cap. Larger files are not read. This is not a malware-scan limit. */
  fileBytes: 32 * 1024 * 1024,
  password: 128,
  country: 80,
  pasteCheck: 4_000,
  notes: 2_000,
} as const;

export function tooBig(value: string, max: number): boolean {
  return value.length > max;
}
