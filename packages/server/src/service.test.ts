import { CompletionItemKind, DiagnosticSeverity, SymbolKind } from "vscode-languageserver";
import { TextDocument } from "vscode-languageserver-textdocument";
import { describe, expect, it } from "vitest";
import {
  checkDocument,
  completions,
  diagnostics,
  foldingRanges,
  formatting,
  hover,
  symbols,
} from "./service.js";

const FLOWER = `creature Flower
// Petals round a centre.

gene rings = 3 in 1..6 step 1  // how many rings of petals

/* A block comment
   over two lines. */
repeat rings {
  whorl(1)
}

part whorl(scale) {
  gene petals = 7 in 3..16 step 1
  shape cone
  grow scale
  lay
}

variant Big { rings = 6 }

background {
  gene top = hsv(250, 0.5, 0.2) in hsv(0, 0, 0)..hsv(360, 1, 1)
  fill top
}

dance {
  spin follows music.bass  from 45 to 170
}
`;

const doc = (text: string) => TextDocument.create("file:///Flower.genie", "genocode", 1, text);
/** The position of the first `word` in the text, plus `along` characters. */
const at = (d: TextDocument, word: string, along = 0) =>
  d.positionAt(d.getText().indexOf(word) + along);

describe("diagnostics", () => {
  it("has none for a correct creature", () => {
    expect(diagnostics(checkDocument(doc(FLOWER)))).toEqual([]);
  });

  it("reports errors where they are", () => {
    const d = doc("creature Bad\n\nforward nowhere\n");
    const [first] = diagnostics(checkDocument(d));
    expect(first?.severity).toBe(DiagnosticSeverity.Error);
    expect(first?.source).toBe("genocode");
    expect(first?.range.start).toEqual({ line: 2, character: 8 });
    expect(first?.message).toMatch(/nowhere/);
  });
});

describe("hover", () => {
  it("explains built-ins and links to the guide", () => {
    const d = doc("creature A\n\nforward clamp(1, 0, 2)\n");
    const h = hover(checkDocument(d), at(d, "clamp", 2));
    const value = (h?.contents as { value: string }).value;
    expect(value).toContain("clamp(x, lo, hi)");
    expect(value).toContain(
      "https://genocode-org.github.io/GenoCode/docs/language.html#181-numbers",
    );
    expect(h?.range).toEqual({
      start: { line: 2, character: 8 },
      end: { line: 2, character: 13 },
    });
  });

  it("explains the creature's own genes", () => {
    const d = doc(FLOWER);
    const value = (hover(checkDocument(d), at(d, "repeat rings", 8))?.contents as { value: string })
      .value;
    expect(value).toContain("gene rings");
    expect(value).toContain("how many rings of petals");
  });

  it("explains dance effect lines", () => {
    const d = doc(FLOWER);
    const value = (hover(checkDocument(d), at(d, "follows", 2))?.contents as { value: string })
      .value;
    expect(value).toContain("follows x");
    expect(value).toContain(
      "https://genocode-org.github.io/GenoCode/docs/language.html#17-dance-styles",
    );
  });

  it("has nothing to say about spaces", () => {
    const d = doc(FLOWER);
    expect(hover(checkDocument(d), { line: 2, character: 0 })).toBeNull();
  });
});

describe("completions", () => {
  it("offers genes, parts and built-ins", () => {
    const d = doc(FLOWER);
    const items = completions(checkDocument(d), at(d, "whorl(1)"));
    const kind = (label: string) => items.find((i) => i.label === label)?.kind;
    expect(kind("rings")).toBe(CompletionItemKind.Field);
    expect(kind("whorl")).toBe(CompletionItemKind.Class);
    expect(kind("clamp")).toBe(CompletionItemKind.Function);
    expect(kind("repeat")).toBe(CompletionItemKind.Keyword);
  });

  it("offers only the parts of music after `music.`", () => {
    const d = doc(FLOWER);
    const items = completions(checkDocument(d), at(d, "music.", 6));
    expect(items.map((i) => i.label)).toContain("bass");
    expect(items.every((i) => i.kind === CompletionItemKind.Property)).toBe(true);
  });
});

describe("formatting", () => {
  it("replaces the whole text with the standard layout", () => {
    const d = doc("creature A\n\ngene  size=2 in 1..3\nforward   size\n");
    expect(formatting(d)).toEqual([
      {
        range: { start: { line: 0, character: 0 }, end: { line: 4, character: 0 } },
        newText: "creature A\n\ngene size = 2 in 1..3\nforward size\n",
      },
    ]);
  });

  it("changes nothing in a file that's already formatted", () => {
    expect(formatting(doc(FLOWER))).toEqual([]);
  });

  it("refuses a file with syntax errors", () => {
    expect(formatting(doc("creature A\n\nrepeat 3 {\n"))).toBeUndefined();
  });
});

describe("symbols", () => {
  it("outlines the creature", () => {
    const [root] = symbols(checkDocument(doc(FLOWER)));
    expect(root?.name).toBe("Flower");
    expect(root?.kind).toBe(SymbolKind.Module);
    const outline = root?.children?.map((s) => [
      s.name,
      s.kind,
      (s.children ?? []).map((c) => c.name),
    ]);
    expect(outline).toEqual([
      ["rings", SymbolKind.Field, []],
      ["whorl", SymbolKind.Class, ["petals"]],
      ["Big", SymbolKind.Constant, []],
      ["background", SymbolKind.Namespace, ["top"]],
      ["dance", SymbolKind.Namespace, []],
    ]);
    expect(root?.children?.[0]?.detail).toBe("1 to 6, steps of 1");
  });

  it("outlines background files", () => {
    const text =
      "background Night\n\ngene top = hsv(250, 0.5, 0.2) in hsv(0, 0, 0)..hsv(360, 1, 1)\nfill top\n";
    const [root] = symbols(checkDocument(doc(text)));
    expect(root?.name).toBe("Night");
    expect(root?.kind).toBe(SymbolKind.Namespace);
    expect(root?.children?.map((s) => s.name)).toEqual(["top"]);
  });
});

describe("folding", () => {
  it("folds blocks and comments that span lines", () => {
    const lines = FLOWER.split("\n");
    const line = (start: string) => lines.findIndex((l) => l.startsWith(start));
    const ranges = foldingRanges(doc(FLOWER)).map((r) => [r.startLine, r.endLine, r.kind]);
    expect(ranges).toContainEqual([line("/*"), line("/*") + 1, "comment"]);
    expect(ranges).toContainEqual([line("part whorl"), line("  lay"), undefined]);
    // A one-line block doesn't fold.
    expect(ranges.some(([s]) => s === line("repeat rings") + 1)).toBe(false);
  });
});
