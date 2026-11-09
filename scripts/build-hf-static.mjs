import { execSync } from "node:child_process";
import { copyFileSync, mkdirSync, writeFileSync } from "node:fs";

const env = { ...process.env, BASE_PATH: "/" };
execSync("npx vite build --outDir ../../dist/hf-static --emptyOutDir", {
  cwd: "apps/web",
  env,
  stdio: "inherit",
});
execSync("node ../../scripts/stamp-web.mjs", {
  cwd: "apps/web",
  env: { ...env, DIST: "../../dist/hf-static" },
  stdio: "inherit",
});
mkdirSync("dist/hf-static", { recursive: true });
writeFileSync(
  "dist/hf-static/README.md",
  `---
title: NXTL Shield
emoji: 🛡️
colorFrom: red
colorTo: gray
sdk: static
license: gpl-3.0
app_file: index.html
---

Free, open-source security tools by NXTL eSIM.
`,
);
copyFileSync("apps/web/public/og/hf-thumbnail.png", "dist/hf-static/thumbnail.png");
console.log("dist/hf-static");
