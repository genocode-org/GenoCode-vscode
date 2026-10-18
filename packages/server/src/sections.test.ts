import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

interface Script {
  sectionsSource(markdown: string): string;
  languageGuide(): string;
}

describe("sections", () => {
  it("match the language guide of the @genocode/core in use (run npm run sections if not)", async () => {
    const script = (await import("../scripts/sections.mjs" as string)) as Script;
    const current = readFileSync(new URL("sections.ts", import.meta.url), "utf8");
    expect(current).toBe(script.sectionsSource(script.languageGuide()));
  });
});
