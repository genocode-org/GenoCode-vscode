// The preview panel's page: checks the text it's sent, builds the creature with @genocode/core and
// draws it with @genocode/render, as the GenoCode app's View does. Moving a gene's control shows
// the new value at once; letting go writes it into the code.

import {
  build,
  buildBackground,
  check,
  formatValue,
  geneEdits,
  geneRange,
  valuesOf,
  type CheckResult,
  type GeneInfo,
  type Value,
} from "@genocode/core";
import { geneControl, InputControls, type GeneEditing } from "@genocode/controls";
import { CreatureView } from "@genocode/render";

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

window.addEventListener(
  "message",
  (e: MessageEvent<{ type: string; text: string; version: number }>) => {
    if (e.data.type === "show") show(e.data.text, e.data.version);
  },
);
$("reset").addEventListener("click", () => view.resetView());
variantMenu.addEventListener("change", () => {
  variant = variantMenu.value;
  if (shown) choose(shown.program);
});
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
    new Option("As written", ""),
    ...program.variants.map((v) => new Option(v.name, v.name)),
  );
  variantMenu.value = variant;
  variantMenu.hidden = program.variants.length === 0;
  choose(program, first);
}

/** Shows the creature with its own genes, or a variant's. */
function choose(program: CheckResult, first = false): void {
  const v = program.variants.find((x) => x.name === variant);
  values = valuesOf(program.genes, v?.values);
  note.hidden = v === undefined;
  note.textContent = "Showing a variant: changes here aren't written into the code.";
  showGenes(program, v === undefined);
  inputs.show(program.live || program.backgroundLive);
  draw(!first);
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

/** A creature that's a ball wearing a pattern file's pattern, as the GenoCode app shows it. Its
 * genes have the pattern file's full names, so the controls work on both. */
function ballWearing(program: CheckResult): CheckResult {
  if (ball?.text !== program.text) {
    const { name, items } = program.file;
    const first = items[0];
    const body = first ? program.text.slice(first.span.start).trimEnd() : "";
    const block = body
      .split("\n")
      .map((l) => (l ? `  ${l}` : ""))
      .join("\n");
    const text = `creature ${name}\n\npattern ${name} {\n${block}\n}\n\nshine 0.3\ntexture pattern(${name}, 200, 1)\nlay\n`;
    ball = { text: program.text, program: check(text) };
  }
  return ball.program;
}

function say(text: string): void {
  status.textContent = text;
}

const editing = (write: boolean): GeneEditing => ({
  input(g, v) {
    values.set(g.fullName, v);
    showValue(g, v);
    draw(true);
  },
  change(g, v) {
    values.set(g.fullName, v);
    showValue(g, v);
    draw(true);
    if (write && shown) {
      const edits = geneEdits(shown.program, new Map([[g.fullName, v]]));
      vscode.postMessage({ type: "edit", version: shown.version, edits });
    }
  },
});

/** The genes, grouped by where they're declared, each with a control and its value. */
function showGenes(program: CheckResult, write: boolean): void {
  const edit = editing(write);
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
    const name = row.insertCell();
    name.className = "name";
    name.textContent = g.name;
    name.title = [g.description, geneRange(g)].filter(Boolean).join(" · ");
    const control = row.insertCell();
    const value = values.get(g.fullName) ?? g.value;
    const element = geneControl(g, value, edit);
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
