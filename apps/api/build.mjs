import { build } from "esbuild";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
for (const entry of ["http.ts", "mcp.ts", "cli.ts"]) {
  await build({
    entryPoints: [join(here, "src", entry)],
    bundle: true,
    platform: "node",
    format: "esm",
    outfile: join(here, "dist", entry.replace(".ts", ".mjs")),
    banner: { js: "import { createRequire } from 'module'; const require = createRequire(import.meta.url);" },
  });
}
console.log("api bundled");
