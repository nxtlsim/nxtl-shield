import { readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const dist = process.env.DIST || "apps/web/dist";
const base = process.env.BASE_PATH || "/nxtl-shield/";
const normalized = base.endsWith("/") ? base : `${base}/`;

function walk(dir) {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) walk(path);
    else if (/\.(js|webmanifest|html|css)$/.test(name)) {
      const text = readFileSync(path, "utf8");
      if (text.includes("__NXTL_BASE__")) writeFileSync(path, text.replaceAll("__NXTL_BASE__", normalized));
    }
  }
}

walk(dist);
writeFileSync(join(dist, ".nojekyll"), "");
console.log(`stamped ${dist} with ${normalized}`);
