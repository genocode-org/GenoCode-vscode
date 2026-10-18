// Builds the extension into dist/: the client, the language server and the grammar, each in one
// file, so the packaged extension needs no node_modules.

import { mkdirSync, writeFileSync } from "node:fs";
import { build } from "esbuild";
import { grammar } from "./grammar.mjs";

const dist = new URL("../dist/", import.meta.url);
mkdirSync(dist, { recursive: true });

const common = {
  bundle: true,
  platform: "node",
  format: "cjs",
  target: "node20",
  sourcemap: true,
  minify: process.argv.includes("--minify"),
  logLevel: "warning",
};

await build({
  ...common,
  entryPoints: [new URL("../src/extension.ts", import.meta.url).pathname],
  outfile: new URL("extension.cjs", dist).pathname,
  external: ["vscode"],
});
await build({
  ...common,
  entryPoints: [new URL("../src/server.ts", import.meta.url).pathname],
  outfile: new URL("server.cjs", dist).pathname,
});
writeFileSync(new URL("genocode.tmLanguage.json", dist), JSON.stringify(grammar(), null, 2) + "\n");
