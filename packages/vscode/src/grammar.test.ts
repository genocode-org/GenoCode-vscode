// Colours sample lines with VS Code's own TextMate engine and checks what each word becomes.

import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { KEYWORDS } from "@genocode/core";
import * as oniguruma from "vscode-oniguruma";
import { INITIAL, Registry, type IGrammar, type IRawGrammar } from "vscode-textmate";
import { beforeAll, describe, expect, it } from "vitest";

interface Script {
  grammar(): IRawGrammar;
  KEYWORD_GROUPS: Record<string, string[]>;
}

let script: Script;
let grammar: IGrammar;

beforeAll(async () => {
  script = (await import("../scripts/grammar.mjs" as string)) as Script;
  const wasm = readFileSync(
    fileURLToPath(import.meta.resolve("vscode-oniguruma/release/onig.wasm")),
  );
  await oniguruma.loadWASM(wasm.buffer.slice(wasm.byteOffset, wasm.byteOffset + wasm.byteLength));
  const registry = new Registry({
    onigLib: Promise.resolve({
      createOnigScanner: (sources) => new oniguruma.OnigScanner(sources),
      createOnigString: (text) => new oniguruma.OnigString(text),
    }),
    loadGrammar: async () => script.grammar(),
  });
  grammar = (await registry.loadGrammar("source.genocode"))!;
});

/** Each word of `text` with the most specific scope it gets, leaving out spaces. */
function colours(text: string): [string, string][] {
  const out: [string, string][] = [];
  let stack = INITIAL;
  for (const line of text.split("\n")) {
    const result = grammar.tokenizeLine(line, stack);
    for (const t of result.tokens) {
      const word = line.slice(t.startIndex, t.endIndex).trim();
      if (word) out.push([word, t.scopes[t.scopes.length - 1]!.replace(/\.genocode$/, "")]);
    }
    stack = result.ruleStack;
  }
  return out;
}

const scopeOf = (text: string, word: string) => colours(text).find(([w]) => w === word)?.[1];

describe("the grammar", () => {
  it("gives every keyword exactly one colour", () => {
    const grouped = Object.values(script.KEYWORD_GROUPS).flat();
    expect([...grouped].sort()).toEqual([...KEYWORDS].sort());
  });

  it("colours declarations", () => {
    expect(colours("creature Flower")).toEqual([
      ["creature", "storage.type"],
      ["Flower", "entity.name.type"],
    ]);
    expect(colours("part whorl(scale) {").slice(0, 2)).toEqual([
      ["part", "storage.type"],
      ["whorl", "entity.name.function"],
    ]);
    const gene = colours("gene petals = 7 in 3..16 step 1  // how many");
    expect(gene).toEqual([
      ["gene", "storage.type"],
      ["petals", "variable.other.constant.gene"],
      ["=", "keyword.operator.assignment"],
      ["7", "constant.numeric"],
      ["in", "keyword.other"],
      ["3", "constant.numeric"],
      ["..", "keyword.operator.range"],
      ["16", "constant.numeric"],
      ["step", "keyword.other"],
      ["1", "constant.numeric"],
      ["//", "punctuation.definition.comment"],
      ["how many", "comment.line.double-slash"],
    ]);
  });

  it("tells built-ins from the creature's own names", () => {
    const line = "lay { shape cone; colour mix(red, petal, 0.5); grow size(2) }";
    expect(scopeOf(line, "shape")).toBe("keyword.other.command");
    expect(scopeOf(line, "cone")).toBe("support.constant");
    expect(scopeOf(line, "mix")).toBe("support.function.builtin");
    expect(scopeOf(line, "red")).toBe("support.constant.colour");
    expect(scopeOf(line, "petal")).toBe("source");
    expect(scopeOf(line, "size")).toBe("entity.name.function.call");
    expect(scopeOf("forward pi * 2", "pi")).toBe("constant.language");
  });

  it("colours inputs, members, numbers and colours", () => {
    const line = "roll 90° * music.bass + turtle.colour.hue; colour #ff8000";
    expect(scopeOf(line, "90°")).toBe("constant.numeric");
    expect(scopeOf(line, "music")).toBe("variable.language");
    expect(scopeOf(line, "bass")).toBe("variable.other.property");
    // `colour` is a keyword, but not after a dot.
    expect(
      colours(line)
        .filter(([w]) => w === "colour")
        .map(([, s]) => s),
    ).toEqual(["variable.other.property", "keyword.other.command"]);
    expect(scopeOf(line, "#ff8000")).toBe("constant.other.color.rgb-value");
    expect(scopeOf("let a = 1.5e-3", "1.5e-3")).toBe("constant.numeric");
  });

  it("colours dance effect lines", () => {
    const line = "  spin follows music.bass_hit  from 45 to 170  smooth 0.4";
    expect(scopeOf(line, "spin")).toBe("keyword.other.effect");
    expect(scopeOf(line, "follows")).toBe("keyword.other.setting");
    expect(scopeOf(line, "smooth")).toBe("keyword.other.setting");
    expect(scopeOf("  turn on music.mid changes  by 1", "changes")).toBe("keyword.other.trigger");
    // Elsewhere these are ordinary names.
    expect(scopeOf("let spin = 1", "spin")).toBe("variable.other.declaration");
  });

  it("colours comments across lines, and strings", () => {
    const text = '/* one\ntwo */ forward 1\nprint "a \\"b\\""';
    expect(scopeOf(text, "two")).toBe("comment.block");
    expect(scopeOf(text, "forward")).toBe("keyword.other.command");
    expect(scopeOf(text, '\\"')).toBe("constant.character.escape");
  });

  it("reads every starter creature and dance style", () => {
    const reference = fileURLToPath(
      new URL("./", import.meta.resolve("@genocode/core/LANGUAGE.md")),
    );
    for (const folder of ["creatures", "dances"]) {
      const dir = reference + folder;
      for (const name of readdirSync(dir).filter((f) => f.endsWith(".genie"))) {
        const scopes = colours(readFileSync(`${dir}/${name}`, "utf8")).map(([, s]) => s);
        expect(scopes.length, name).toBeGreaterThan(10);
        expect(
          scopes.filter((s) => s.startsWith("invalid")),
          name,
        ).toEqual([]);
      }
    }
  });
});
