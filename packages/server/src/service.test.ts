import {
  CompletionItemKind,
  DiagnosticSeverity,
  DocumentHighlightKind,
  SymbolKind,
} from "vscode-languageserver";
import { TextDocument } from "vscode-languageserver-textdocument";
import type { Range } from "vscode-languageserver";
import { describe, expect, it } from "vitest";
import {
  checkDocument,
  colourChoices,
  colours,
  completions,
  definition,
  diagnostics,
  foldingRanges,
  formatting,
  highlights,
  hover,
  references,
  renameTarget,
  renaming,
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
    expect(value).toContain("https://genocode.piorek.co.za/docs/language.html#181-numbers");
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
    expect(value).toContain("https://genocode.piorek.co.za/docs/language.html#17-dance-styles");
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

describe("symbols of patterns", () => {
  const file =
    "pattern Ripples\n\ngene rings = 8 in 2..20\n\nlet lumps = clouds(5, 3)\nvalue picture {\n  value lumps(x, y) * rings\n}\n";

  it("explain the picture functions and offer them in pattern code", () => {
    const d = doc(file);
    const h = hover(checkDocument(d), at(d, "clouds", 2));
    const value = (h?.contents as { value: string }).value;
    expect(value).toContain("clouds(layers, size)");
    expect(value).toContain("#187-pictures");
    const items = completions(checkDocument(d), at(d, "lumps(x"));
    expect(items.find((i) => i.label === "rings")?.kind).toBe(CompletionItemKind.Field);
    expect(items.some((i) => i.label === "blur")).toBe(true);
  });

  it("outlines pattern files and pattern blocks with their genes", () => {
    const file =
      "pattern Ripples\n\ngene rings = 8 in 2..20\n\nvalue picture {\n  value r * rings\n}\n";
    const [root] = symbols(checkDocument(doc(file)));
    expect([root?.name, root?.detail]).toEqual(["Ripples", "pattern"]);
    expect(root?.children?.map((s) => s.name)).toEqual(["rings"]);
    const creature =
      "creature Shell\n\npattern Ripples {\n  gene rings = 8 in 2..20\n\n  value picture {\n    value r * rings\n  }\n}\n\ntexture pattern(Ripples, 30, 4)\nlay\n";
    const [shell] = symbols(checkDocument(doc(creature)));
    const outline = shell?.children?.map((s) => [s.name, s.kind, s.children?.map((c) => c.name)]);
    expect(outline).toEqual([["Ripples", SymbolKind.Namespace, ["rings"]]]);
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

describe("names", () => {
  const d = doc(FLOWER);
  const c = checkDocument(d);
  const lines = (ranges: { range: { start: { line: number } } }[]) =>
    ranges.map((r) => r.range.start.line);

  it("goes to a gene's declaration from a use", () => {
    expect(definition(c, at(d, "repeat rings", 8))?.range).toEqual({
      start: { line: 3, character: 5 },
      end: { line: 3, character: 10 },
    });
    expect(definition(c, at(d, "shape"))).toBeNull();
  });

  it("finds every use, with or without the declaration", () => {
    expect(lines(references(c, at(d, "whorl(1)"), true))).toEqual([8, 11]);
    expect(lines(references(c, at(d, "whorl(1)"), false))).toEqual([8]);
    // The variant sets `rings` too.
    expect(lines(references(c, at(d, "rings"), true))).toEqual([3, 7, 18]);
  });

  it("highlights the declaration as written and the uses as read", () => {
    expect(highlights(c, at(d, "rings")).map((h) => h.kind)).toEqual([
      DocumentHighlightKind.Write,
      DocumentHighlightKind.Read,
      DocumentHighlightKind.Read,
    ]);
  });

  it("renames, asking first when a gene's full name changes", () => {
    expect(renameTarget(c, at(d, "whorl(1)"))?.placeholder).toBe("whorl");
    expect(renameTarget(c, at(d, "shape"))).toBeUndefined();
    const part = renaming(c, at(d, "whorl(1)"), "crown");
    expect("edits" in part && part.edits.map((e) => e.newText)).toEqual(["crown", "crown"]);
    expect("edits" in part && part.warning).toContain("whorl.petals");
    expect(renaming(c, at(d, "rings"), "red")).toEqual({ error: "`red` is built in." });
  });
});

describe("colours", () => {
  const d = doc("creature A\n\ncolour hsv(30, 1, 1)\ncolour #ff000080\ncolour red\n");

  it("shows a swatch for each colour written out", () => {
    const found = colours(d);
    expect(found.map((c) => c.range.start.line)).toEqual([2, 3, 4]);
    expect(found[0]?.color).toEqual({ red: 1, green: 0.5, blue: 0, alpha: 1 });
    expect(found[1]?.color.alpha).toBeCloseTo(0.5, 2);
  });

  it("writes a picked colour its own way first", () => {
    const [hsvColour, hex, name] = colours(d);
    const blue = { red: 0, green: 0, blue: 1, alpha: 1 };
    const labels = (i: { range: Range }) => colourChoices(d, blue, i.range).map((p) => p.label);
    expect(labels(hsvColour!)).toEqual(["hsv(240, 1, 1)", "rgb(0, 0, 1)", "#0000ff", "blue"]);
    // The hex colour was written with an alpha, so it keeps one.
    expect(labels(hex!)[0]).toBe("#0000ffff");
    expect(labels(name!)[0]).toBe("blue");
  });
});
