import { build } from "esbuild";
import { cpSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "../..");
execFileSync("python3", [join(root, "scripts/build_extension_rules.py")], { stdio: "inherit" });

const KEY =
  "MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAmRqtjaSrhEHwJ6Y0LlFaA60ZpVaTj9zhmcYi8Gug9X3HqWiPdekliSQ9qkGdWHqe2VDQYaT6THrbknbMQVVGzu9vZr7mAtacR2Xpk/Cs26r8yv/EYhs60gmVQ2Y36phRUwg8h/X/pVlNtYMikmyEju1iBWWlQiCasXVOQCZn/aAbZjtWDcpjbdh3eXhiqeH0U3fagzqtDOm8VCHvGVb2fxScpcfIywUlc/pB+D1fuzvvq/jxU0GwmZZKPvmxejs1JAcrHDEbOwunf6nQcOnutb+WbBJkA9ezJy22CJDSNFe8qKQPwiJCAk5N+qgrTmpI/5jo4B6zKjugVfDW/H7CHwIDAQAB";

const shared = {
  manifest_version: 3,
  name: "NXTL Shield",
  version: "0.5.0",
  description: "Free open-source browser protection by NXTL eSIM: known phishing and malware warnings, tracker blocking, link cleaning, and cookie-banner controls.",
  action: { default_popup: "popup.html", default_title: "NXTL Shield" },
  icons: { 16: "icons/icon-16.png", 32: "icons/icon-32.png", 48: "icons/icon-48.png", 128: "icons/icon-128.png" },
  permissions: ["declarativeNetRequest", "storage", "alarms", "scripting", "tabs", "webRequest", "webNavigation"],
  host_permissions: ["<all_urls>"],
};

function manifest(target) {
  const rules = target === "chromium" ? "threats.chromium.json" : "threats.firefox.json";
  const body = {
    ...shared,
    background:
      target === "chromium"
        ? { service_worker: "background.js", type: "module" }
        : { scripts: ["background.js"], type: "module" },
    permissions: target === "chromium" ? [...shared.permissions, "contentSettings"] : shared.permissions,
    declarative_net_request: {
      rule_resources: [
        { id: "threats", enabled: true, path: "rules/threats.json" },
        { id: "trackers", enabled: true, path: "rules/trackers.json" },
        { id: "cleaning", enabled: true, path: "rules/cleaning.json" },
      ],
    },
    content_scripts: [
      {
        matches: ["https://nxtlsim.github.io/*", "http://localhost/*", "http://127.0.0.1/*"],
        js: ["bridge.js"],
        run_at: "document_start",
      },
      { matches: ["<all_urls>"], js: ["cosmetic.js"], run_at: "document_idle" },
    ],
  };
  if (target === "chromium") {
    body.key = KEY;
    body.externally_connectable = { matches: ["https://nxtlsim.github.io/*", "http://localhost/*", "http://127.0.0.1/*"] };
  } else {
    body.browser_specific_settings = {
      gecko: {
        id: "shield@nxtlsim.com",
        strict_min_version: "115.0",
        data_collection_permissions: { required: ["none"] },
      },
      gecko_android: { strict_min_version: "115.0" },
    };
  }
  return { body, rules };
}

async function pack(target) {
  const dist = join(here, target === "chromium" ? "dist-chromium" : "dist-firefox");
  rmSync(dist, { recursive: true, force: true });
  mkdirSync(join(dist, "rules"), { recursive: true });
  mkdirSync(join(dist, "icons"), { recursive: true });
  const entries = ["background.ts", "bridge.ts", "popup.ts", "warning.ts", "cosmetic.ts"];
  await Promise.all(
    entries.map((entry) =>
      build({
        entryPoints: [join(here, "src", entry)],
        bundle: true,
        format: "esm",
        outfile: join(dist, entry.replace(/\.ts$/, ".js")),
        platform: "browser",
        target: "es2022",
      }),
    ),
  );
  cpSync(join(here, "src/popup.html"), join(dist, "popup.html"));
  cpSync(join(here, "src/warning.html"), join(dist, "warning.html"));
  cpSync(join(here, "icons"), join(dist, "icons"), { recursive: true });
  const { body, rules } = manifest(target);
  writeFileSync(join(dist, "manifest.json"), JSON.stringify(body, null, 2));
  cpSync(join(here, "generated", rules), join(dist, "rules/threats.json"));
  cpSync(join(here, "generated/trackers.json"), join(dist, "rules/trackers.json"));
  cpSync(join(here, "generated/cleaning.json"), join(dist, "rules/cleaning.json"));
  cpSync(join(here, "generated/meta.json"), join(dist, "rules/meta.json"));
  const artifactDir = join(root, "dist/artifacts");
  mkdirSync(artifactDir, { recursive: true });
  const zipName = target === "chromium" ? "nxtl-shield-chromium-mv3.zip" : "nxtl-shield-firefox-mv3.xpi";
  execFileSync("python3", ["-c", `import shutil,sys; shutil.make_archive(sys.argv[1], 'zip', sys.argv[2])`, join(artifactDir, zipName.replace(/\.zip$|\.xpi$/, "")), dist]);
  const made = join(artifactDir, zipName.replace(/\.xpi$/, ".zip").replace(/\.zip$/, "") + ".zip");
  if (target === "firefox") {
    execFileSync("mv", [made, join(artifactDir, "nxtl-shield-firefox-mv3.xpi")]);
  }
  console.log("packed", target, dist);
}

await pack("chromium");
await pack("firefox");
const meta = JSON.parse(readFileSync(join(here, "generated/meta.json"), "utf8"));
if (meta.threatRules > 20000) throw new Error("rule cap exceeded");
