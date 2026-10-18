// Builds the extension into dist/: the client, the language server, the preview panel's page and
// the grammar, each in one file, so the packaged extension needs no node_modules.

import { copyFileSync, mkdirSync, writeFileSync } from "node:fs";
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
// The preview panel's page runs in a browser.
await build({
  ...common,
  platform: "browser",
  format: "iife",
  target: "es2022",
  entryPoints: [new URL("../src/webview/main.ts", import.meta.url).pathname],
  outfile: new URL("preview.js", dist).pathname,
});
copyFileSync(new URL("../src/webview/preview.css", import.meta.url), new URL("preview.css", dist));
writeFileSync(new URL("genocode.tmLanguage.json", dist), JSON.stringify(grammar(), null, 2) + "\n");
