// The preview panel's page: checks the text it's sent, builds the creature with @genocode/core and
// draws it with @genocode/render, as the GenoCode app's View does. Moving a gene's control shows
// the new value at once; letting go writes it into the code: into the gene's line, or into the
// variant's block while a variant is shown. The cursor in a variant's block shows that variant.

import {
  build,
  buildBackground,
  check,
  formatValue,
  geneEdits,
  geneRange,
  patternOnBall,
  valuesOf,
  variantEdits,
  type CheckResult,
  type GeneInfo,
  type Value,
} from "@genocode/core";
import { geneControl, InputControls, type GeneEditing } from "@genocode/controls";
import { CreatureView, type Side } from "@genocode/render";

interface VsCodeApi {
  postMessage(message: unknown): void;
}
declare function acquireVsCodeApi(): VsCodeApi;

const vscode = acquireVsCodeApi();
const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;

const view = new CreatureView($<HTMLCanvasElement>("canvas"));
const status = $("status");
const note = $("note");
const genes = $<HTMLTableElement>("genes");
const variantMenu = $<HTMLSelectElement>("variant");
const inputs = new InputControls($("inputs"), () => draw(true));

/** The last text that checked without errors, what's on show, and the version it came from. */
let shown: { program: CheckResult; version: number } | undefined;
let values = new Map<string, Value>();
let variant = "";
let liveFrame = 0;
/** The side the creature was last looked at from, to frame each variant from; none for the
 * usual view. */
let side: Side | undefined;

/** What the extension sends: the text to show, or where the cursor has moved to. */
type FromExtension =
  { type: "show"; text: string; version: number } | { type: "cursor"; at: number; version: number };

window.addEventListener("message", (e: MessageEvent<FromExtension>) => {
  if (e.data.type === "show") show(e.data.text, e.data.version);
  if (e.data.type === "cursor") cursorMoved(e.data.at, e.data.version);
});
$("reset").addEventListener("click", () => {
  side = undefined;
  view.resetView();
});
for (const b of document.querySelectorAll<HTMLButtonElement>("[data-side]")) {
  b.addEventListener("click", () => {
    side = b.dataset["side"] as Side;
    view.viewFrom(side);
  });
}
variantMenu.addEventListener("change", () => {
  variant = variantMenu.value;
  if (!shown) return;
  choose(shown.program, true);
  // The code's cursor goes to the variant's block, or to the creature's first gene.
  const { program, version } = shown;
  const at =
    variant === ""
      ? program.genes.find((g) => g.decl)?.decl?.span.start
      : program.variants.find((v) => v.name === variant)?.decl.nameSpan.end;
  if (at !== undefined) vscode.postMessage({ type: "reveal", version, at });
});

/**
 * The cursor in a variant's block shows that variant; on a gene's line, the creature itself.
 * Anywhere else, what's on show stays, so the drawing code can be changed while a variant is shown.
 */
function cursorMoved(at: number, version: number): void {
  if (!shown || shown.version !== version) return;
  const { program } = shown;
  const inside = (span: { start: number; end: number }) => span.start <= at && at <= span.end;
  const found = program.variants.find((v) => inside(v.decl.span));
  const next = found
    ? found.name
    : program.genes.some((g) => g.decl && inside(g.decl.span))
      ? ""
      : variant;
  if (next === variant) return;
  variant = next;
  variantMenu.value = variant;
  choose(program, true);
}
vscode.postMessage({ type: "ready" });

function show(text: string, version: number): void {
  const program = check(text);
  const errors = program.diagnostics.filter((d) => d.severity === "error").length;
  if (!program.ok || program.file.kind === "dance") {
    if (program.file.kind === "dance" && program.ok) {
      say("A dance style moves creatures to music; dance it in the GenoCode app.");
    } else if (shown) {
      // Keep the last good version on show while the text is being fixed.
      say(`${errors} error${errors === 1 ? "" : "s"}: showing the last version without errors.`);
    } else say(`${errors} error${errors === 1 ? "" : "s"}. Fix them to see the creature.`);
    return;
  }
  const first = shown === undefined;
  shown = { program, version };
  if (!program.variants.some((v) => v.name === variant)) variant = "";
  variantMenu.replaceChildren(
    new Option(`${program.file.name || "The creature"} itself`, ""),
    ...program.variants.map((v) => new Option(v.name, v.name)),
  );
  variantMenu.value = variant;
  variantMenu.hidden = program.variants.length === 0;
  choose(program, first);
}

/**
 * Shows the creature with its own genes, or a variant's. With `reframe`, the camera frames it
 * afresh, as when another variant is picked; otherwise it stays where it is.
 */
function choose(program: CheckResult, reframe = false): void {
  const v = program.variants.find((x) => x.name === variant);
  values = valuesOf(program.genes, v?.values);
  note.hidden = v === undefined;
  note.textContent = `Showing ${variant}: changes are written into its block. Its own genes are marked; ↺ puts one back to the creature's value.`;
  showGenes(program);
  inputs.show(program.live || program.backgroundLive);
  draw(!reframe);
}

/** Draws the creature; creatures that read time are drawn again every frame while it runs. */
function draw(keepView: boolean): void {
  cancelAnimationFrame(liveFrame);
  if (!shown) return;
  const { program } = shown;
  const { kind } = program.file;
  const options = { genes: values, inputs: inputs.now() ?? {} };
  const built =
    kind === "creature"
      ? build(program, options)
      : kind === "pattern"
        ? build(ballWearing(program), options)
        : { shapes: [], diagnostics: [] };
  view.setCreature(built.shapes, keepView);
  if (!keepView && side) view.viewFrom(side);
  view.setBackground(kind === "pattern" ? undefined : buildBackground(program, options).fill);
  const problem = built.diagnostics[0];
  if (problem) say(problem.message);
  else if (kind === "background") say("A background.");
  else if (kind === "pattern") say("A pattern, on a ball.");
  else say(`${built.shapes.length} shape${built.shapes.length === 1 ? "" : "s"}`);
  const live = program.live || program.backgroundLive;
  if (live && inputs.running) liveFrame = requestAnimationFrame(() => draw(true));
}

let ball: { text: string; program: CheckResult } | undefined;

/** A pattern file as a ball wearing it, as the GenoCode app shows it. Its genes have the pattern
 * file's full names, so the controls work on both. */
function ballWearing(program: CheckResult): CheckResult {
  if (ball?.text !== program.text) ball = { text: program.text, program: patternOnBall(program) };
  return ball.program;
}

function say(text: string): void {
  status.textContent = text;
}

/** Sends edits for the text on show to the extension, which applies them to the file. */
function write(edits: { start: number; end: number; text: string }[]): void {
  if (shown) vscode.postMessage({ type: "edit", version: shown.version, edits });
}

const editing: GeneEditing = {
  input(g, v) {
    values.set(g.fullName, v);
    showValue(g, v);
    draw(true);
  },
  change(g, v) {
    values.set(g.fullName, v);
    showValue(g, v);
    draw(true);
    if (!shown) return;
    const changed = new Map([[g.fullName, v]]);
    write(
      variant === ""
        ? geneEdits(shown.program, changed)
        : variantEdits(shown.program, variant, changed),
    );
  },
};

/** The genes, grouped by where they're declared, each with a control and its value. */
function showGenes(program: CheckResult): void {
  // A variant's own genes stand out; the rest are the creature's.
  const own = program.variants.find((v) => v.name === variant)?.values;
  const rows: HTMLTableRowElement[] = [];
  let group: string | undefined;
  for (const g of program.genes) {
    if (g.section === "dance") continue; // they move the creature to music, not its shape
    // A pattern file's genes all belong to its pattern, so they aren't grouped.
    const where =
      g.section === "background"
        ? "background"
        : program.file.kind === "pattern"
          ? undefined
          : g.owner;
    if (where !== group && where !== undefined) {
      const row = document.createElement("tr");
      row.className = "group";
      const cell = row.insertCell();
      cell.colSpan = 3;
      cell.textContent = where;
      rows.push(row);
    }
    group = where;
    const row = document.createElement("tr");
    row.dataset.gene = g.fullName;
    if (own) row.className = own.has(g.fullName) ? "own" : "inherited";
    const name = row.insertCell();
    name.className = "name";
    name.textContent = g.name;
    name.title = [g.description, geneRange(g)].filter(Boolean).join(" · ");
    if (own?.has(g.fullName)) {
      const reset = document.createElement("button");
      reset.className = "reset";
      reset.textContent = "↺";
      reset.title = "Back to the creature's own value";
      reset.addEventListener("click", () => {
        if (shown) write(variantEdits(shown.program, variant, new Map(), [g.fullName]));
      });
      name.prepend(reset);
    }
    const control = row.insertCell();
    const value = values.get(g.fullName) ?? g.value;
    const element = geneControl(g, value, editing);
    if (element) control.append(element);
    const text = row.insertCell();
    text.className = "value";
    text.textContent = formatValue(value);
    rows.push(row);
  }
  genes.replaceChildren(...rows);
}

function showValue(g: GeneInfo, v: Value): void {
  const cell = genes.querySelector(`tr[data-gene="${CSS.escape(g.fullName)}"] .value`);
  if (cell) cell.textContent = formatValue(v);
}
