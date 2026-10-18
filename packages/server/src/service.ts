// What the language server knows about a .genie file, as plain functions of its text, so they can be
// tested without an editor. Everything comes from @genocode/core, the same code the web app uses.

import {
  check,
  completionsAt,
  formatText,
  geneRange,
  helpAt,
  lex,
  type CheckResult,
  type CompletionKind,
  type Diagnostic as CoreDiagnostic,
  type GeneInfo,
  type Span,
  type Stmt,
} from "@genocode/core";
import {
  CompletionItemKind,
  DiagnosticSeverity,
  FoldingRangeKind,
  MarkupKind,
  SymbolKind,
  type CompletionItem,
  type Diagnostic,
  type DocumentSymbol,
  type FoldingRange,
  type Hover,
  type Position,
  type Range,
  type TextEdit,
} from "vscode-languageserver";
import type { TextDocument } from "vscode-languageserver-textdocument";
import { sectionLink } from "./sections.js";

/** A document and what the checker found in it. */
export interface Checked {
  document: TextDocument;
  program: CheckResult;
}

export function checkDocument(document: TextDocument): Checked {
  return { document, program: check(document.getText()) };
}

const rangeOf = (document: TextDocument, span: Span): Range => ({
  start: document.positionAt(span.start),
  end: document.positionAt(span.end),
});

/** The checker's errors and warnings. */
export function diagnostics({ document, program }: Checked): Diagnostic[] {
  return program.diagnostics.map((d: CoreDiagnostic) => ({
    range: rangeOf(document, d.span),
    severity: d.severity === "error" ? DiagnosticSeverity.Error : DiagnosticSeverity.Warning,
    message: d.message,
    source: "genocode",
  }));
}

/** Help for the word under the pointer, with a link to its section of the language guide. */
export function hover({ document, program }: Checked, position: Position): Hover | null {
  const found = helpAt(program, document.offsetAt(position));
  if (!found) return null;
  const { title, text, section } = found.help;
  const link = sectionLink(section);
  const more = link ? `\n\n[Language guide, section ${section}](${link})` : "";
  return {
    contents: {
      kind: MarkupKind.Markdown,
      value: "```genocode\n" + title + "\n```\n\n" + text + more,
    },
    range: rangeOf(document, found.span),
  };
}

const COMPLETION_KINDS: Record<CompletionKind, CompletionItemKind> = {
  keyword: CompletionItemKind.Keyword,
  function: CompletionItemKind.Function,
  constant: CompletionItemKind.Constant,
  input: CompletionItemKind.Variable,
  gene: CompletionItemKind.Field,
  part: CompletionItemKind.Class,
  variable: CompletionItemKind.Variable,
  member: CompletionItemKind.Property,
};

/** The names that can be typed at `position`. */
export function completions({ document, program }: Checked, position: Position): CompletionItem[] {
  return completionsAt(program, document.offsetAt(position)).map((c) => ({
    label: c.label,
    kind: COMPLETION_KINDS[c.kind],
    detail: c.detail,
  }));
}

/** The whole file in standard layout, or undefined if it has syntax errors. */
export function formatting(document: TextDocument): TextEdit[] | undefined {
  const text = document.getText();
  const formatted = formatText(text).text;
  if (formatted === undefined) return undefined;
  if (formatted === text) return [];
  return [{ range: rangeOf(document, { start: 0, end: text.length }), newText: formatted }];
}

/** The outline: the creature, its genes, parts, functions, variants, background and dance. */
export function symbols({ document, program }: Checked): DocumentSymbol[] {
  const { file } = program;
  const range = (span: Span) => rangeOf(document, span);
  const geneSymbol = (g: GeneInfo): DocumentSymbol => ({
    name: g.name,
    detail: geneRange(g),
    kind: SymbolKind.Field,
    range: range(g.span),
    selectionRange: range(g.decl!.nameSpan),
  });
  const genesOf = (owner: string | undefined, section: string) =>
    program.genes
      .filter((g) => g.decl && g.owner === owner && g.section === section)
      .map(geneSymbol);

  const children: DocumentSymbol[] = [];
  const top = file.kind === "creature" ? "creature" : file.kind;
  for (const g of genesOf(undefined, top)) children.push(g);
  for (const item of file.items) {
    const named = (kind: SymbolKind, inside: DocumentSymbol[] = []): DocumentSymbol | undefined =>
      "nameSpan" in item
        ? {
            name: item.name,
            kind,
            range: range(item.span),
            selectionRange: range(item.nameSpan),
            children: inside,
          }
        : undefined;
    let symbol: DocumentSymbol | undefined;
    switch (item.kind) {
      case "Part":
        symbol = named(SymbolKind.Class, genesOf(item.name, "creature"));
        break;
      case "Function":
        symbol = named(SymbolKind.Function, genesOf(item.name, "creature"));
        break;
      case "Variant":
        symbol = named(SymbolKind.Constant);
        break;
      case "Background":
      case "Dance":
        symbol = blockSymbol(item, range, genesOf(undefined, item.kind.toLowerCase()));
        break;
    }
    if (symbol) children.push(symbol);
  }
  children.sort((a, b) => document.offsetAt(a.range.start) - document.offsetAt(b.range.start));
  return [
    {
      name: file.name || "(no name)",
      detail: file.kind,
      kind: file.kind === "creature" ? SymbolKind.Module : SymbolKind.Namespace,
      range: range(file.span),
      selectionRange: range(file.nameSpan),
      children,
    },
  ];
}

function blockSymbol(
  item: Stmt,
  range: (span: Span) => Range,
  genes: DocumentSymbol[],
): DocumentSymbol {
  const keyword = item.kind === "Background" ? "background" : "dance";
  const head = { start: item.span.start, end: item.span.start + keyword.length };
  return {
    name: keyword,
    kind: SymbolKind.Namespace,
    range: range(item.span),
    selectionRange: range(head),
    children: genes,
  };
}

/** Blocks in `{ }` and comments that span lines. */
export function foldingRanges(document: TextDocument): FoldingRange[] {
  const { tokens, comments } = lex(document.getText());
  const line = (offset: number) => document.positionAt(offset).line;
  const out: FoldingRange[] = [];
  const open: number[] = [];
  for (const t of tokens) {
    if (t.kind !== "op") continue;
    if (t.text === "{") open.push(line(t.span.start));
    else if (t.text === "}") {
      const start = open.pop();
      // Fold up to the line before `}`, so the closing brace stays in sight.
      const end = line(t.span.start) - 1;
      if (start !== undefined && end > start) out.push({ startLine: start, endLine: end });
    }
  }
  // Runs of `//` lines fold together, like one block comment.
  let run: { start: number; end: number } | undefined;
  const endRun = () => {
    if (run && run.end > run.start)
      out.push({ startLine: run.start, endLine: run.end, kind: FoldingRangeKind.Comment });
    run = undefined;
  };
  for (const c of comments) {
    if (c.text.startsWith("/*")) {
      endRun();
      if (c.endLine > c.line)
        out.push({ startLine: c.line, endLine: c.endLine, kind: FoldingRangeKind.Comment });
    } else if (!c.ownLine) {
      endRun();
    } else if (run && c.line === run.end + 1) {
      run.end = c.line;
    } else {
      endRun();
      run = { start: c.line, end: c.line };
    }
  }
  endRun();
  return out;
}
