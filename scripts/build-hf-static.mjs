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

Free, open-source security tools by NXTL eSIM. Check a link or message, see your connection, turn on Safe DNS, and encrypt a file or message in your browser. No account required.

## Screenshots

![Home](https://raw.githubusercontent.com/nxtlsim/nxtl-shield/main/docs/screenshots/home-1280-light.png)

![Lottery message marked Likely scam](https://raw.githubusercontent.com/nxtlsim/nxtl-shield/main/docs/screenshots/check-result-1280-light.png)

![Your connection details](https://raw.githubusercontent.com/nxtlsim/nxtl-shield/main/docs/screenshots/connection-1280-light.png)

![Windows Safe DNS setup](https://raw.githubusercontent.com/nxtlsim/nxtl-shield/main/docs/screenshots/setup-1280-light.png)

![Secure Share](https://raw.githubusercontent.com/nxtlsim/nxtl-shield/main/docs/screenshots/share-1280-light.png)

Open the live Space, or use the [GitHub Pages app](https://nxtlsim.github.io/nxtl-shield/) and the [source repository](https://github.com/nxtlsim/nxtl-shield).
`,
);
copyFileSync("apps/web/public/og/hf-thumbnail.png", "dist/hf-static/thumbnail.png");
console.log("dist/hf-static");
