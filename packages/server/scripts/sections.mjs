// Writes src/sections.ts: where each numbered section of the language guide is on the website.
// Run it (npm run sections) after moving to a version of @genocode/core whose guide has changed.

import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

/** A heading's anchor, made the way the website makes them (GitHub's way). */
function slug(text) {
  return text
    .toLowerCase()
    .replace(/<[^>]+>/g, "")
    .replace(/[^\p{L}\p{N}\s_-]/gu, "")
    .trim()
    .replace(/\s/g, "-");
}

/** The text of src/sections.ts for a version of LANGUAGE.md. */
export function sectionsSource(markdown) {
  const lines = [];
  for (const [, heading] of markdown.matchAll(/^#{2,3} +(.+)$/gm)) {
    const number = /^(\d+(?:\.\d+)?)\.? /.exec(heading)?.[1];
    if (number) lines.push(`  ["${number}", "${slug(heading)}"],`);
  }
  return `// Made by scripts/sections.mjs from @genocode/core's LANGUAGE.md. Don't edit it by hand.

/** The language guide on the website. */
export const GUIDE = "https://genocode-org.github.io/GenoCode/language.html";

/** Each numbered section's anchor in the guide. */
export const SECTIONS: ReadonlyMap<string, string> = new Map([
${lines.join("\n")}
]);

/** A link to a section of the guide, such as \`18.1\`. */
export function sectionLink(section: string): string | undefined {
  const anchor = SECTIONS.get(section);
  return anchor ? \`\${GUIDE}#\${anchor}\` : undefined;
}
`;
}

export function languageGuide() {
  return readFileSync(fileURLToPath(import.meta.resolve("@genocode/core/LANGUAGE.md")), "utf8");
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const out = new URL("../src/sections.ts", import.meta.url);
  writeFileSync(out, sectionsSource(languageGuide()));
}
