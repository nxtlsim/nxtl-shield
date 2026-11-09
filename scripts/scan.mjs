import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";

const files = execSync("git ls-files", { encoding: "utf8" }).trim().split("\n");
const patterns = [/-----BEGIN (?:RSA |OPENSSH |EC )?PRIVATE KEY-----/, /AKIA[0-9A-Z]{16}/, /ghp_[A-Za-z0-9]{20,}/, /hf_[A-Za-z0-9]{20,}/];
let failed = false;
for (const file of files) {
  if (/\.(png|woff2?|zip|xpi)$/.test(file)) continue;
  const text = readFileSync(file, "utf8");
  for (const pattern of patterns) {
    if (pattern.test(text)) {
      console.error(`${file} matched ${pattern}`);
      failed = true;
    }
  }
}
if (failed) process.exit(1);
console.log(`scanned ${files.length} files`);
