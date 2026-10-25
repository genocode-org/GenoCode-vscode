// The preview panel's page: checks the text it's sent, builds the creature with @genocode/core and
// draws it with @genocode/render, as the GenoCode app's View does. Moving a gene's control shows
// the new value at once; letting go writes it into the code: into the gene's line, or into the
// variant's block while a variant is shown. The cursor in a variant's block shows that variant.
// Morph blends the creature into each of its variants in turn (or into mutants of it), as the
// app's Morph does.

import {
  build,
  buildBackground,
  check,
  formatValue,
  geneEdits,
  geneRange,
  morph,
  mutate,
  patternOnBall,
  valuesOf,
  variantEdits,
  type BuildOptions,
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
const morphButton = $<HTMLButtonElement>("morph");
const playButton = $<HTMLButtonElement>("play");
const inputs = new InputControls($("inputs"), () => draw(true));

/** The last text that checked without errors, what's on show, and the version it came from. */
let shown: { program: CheckResult; version: number } | undefined;
let values = new Map<string, Value>();
let variant = "";
let liveFrame = 0;
/** The side the creature was last looked at from, to frame each variant from; none for the
 * usual view. */
let side: Side | undefined;

/** One creature of the morph loop: the creature itself, a variant or a mutant. */
interface Member {
  label: string;
  values: Map<string, Value>;
}
let morphing = false;
let members: Member[] = [];
/** Mutants, made once each time Morph starts, so editing the code doesn't make new ones. */
let mutants: Map<string, Value>[] = [];
/** Where the loop is, from 0 up to 1 and round again. */
let position = 0;
let playing = true;
/** Seconds from one creature to the next. */
let secondsEach = 3;
let started = 0;
let last = 0;
let lastPanel = 0;
let morphFrame = 0;

/** What the extension sends: the text to show (`another` when it's from a different file), or
 * where the cursor has moved to. */
type FromExtension =
  | { type: "show"; text: string; version: number; another?: boolean }
  | { type: "cursor"; at: number; version: number };

window.addEventListener("message", (e: MessageEvent<FromExtension>) => {
  if (e.data.type === "show") show(e.data.text, e.data.version, e.data.another);
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

// The camera button's menu: choosing a side closes it, as do a click elsewhere and Esc.
const camera = $("camera");
const cameraMenu = $("camera-menu");
function openCamera(open: boolean): void {
  cameraMenu.hidden = !open;
  camera.setAttribute("aria-expanded", String(open));
  if (open) cameraMenu.querySelector<HTMLButtonElement>("button")?.focus();
}
camera.addEventListener("click", () => openCamera(cameraMenu.hasAttribute("hidden")));
cameraMenu.addEventListener("click", (e) => {
  if ((e.target as HTMLElement).closest("[role=menuitem]")) openCamera(false);
});
document.addEventListener("pointerdown", (e) => {
  const target = e.target as Node;
  if (!cameraMenu.hidden && !cameraMenu.contains(target) && !camera.contains(target)) {
    openCamera(false);
  }
});
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && !cameraMenu.hidden) {
    openCamera(false);
    camera.focus();
  }
});

$("inputs-toggle").addEventListener("click", () => {
  const open = $("inputs").classList.toggle("open");
  $("inputs-toggle").setAttribute("aria-expanded", String(open));
});
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
  if (!shown || shown.version !== version || morphing) return;
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

morphButton.addEventListener("click", () => setMorphing(!morphing));
playButton.addEventListener("click", () => {
  playing = !playing;
  playButton.dataset["state"] = playing ? "pause" : "play";
  playButton.setAttribute("aria-label", playing ? "Pause" : "Play");
  playButton.title = playing ? "Pause" : "Play";
});
$<HTMLInputElement>("speed").addEventListener("input", (e) => {
  secondsEach = Number((e.target as HTMLInputElement).value);
});

vscode.postMessage({ type: "ready" });

function show(text: string, version: number, another = false): void {
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
  $("bar").hidden = false;
  $("variant-chip").hidden = program.variants.length === 0;
  const morphable = program.genes.some((g) => g.section !== "dance");
  morphButton.disabled = !morphable;
  morphButton.title = morphable
    ? "Blend the creature into each of its variants in turn, or into mutants of it when it has none"
    : "This has no genes, so there's nothing to morph";
  if (morphing && morphable && !another) {
    // The loop carries on where it was, with the new code.
    members = loopMembers(program);
    inputs.show(program.live || program.backgroundLive);
    showGenes(program);
    return;
  }
  // Another file starts its own loop, from its first creature.
  const restart = morphing && morphable;
  if (morphing) setMorphing(false);
  else choose(program, first);
  if (restart) setMorphing(true);
}

/**
 * Shows the creature with its own genes, or a variant's. With `reframe`, the camera frames it
 * afresh, as when another variant is picked; otherwise it stays where it is.
 */
function choose(program: CheckResult, reframe = false): void {
  const v = program.variants.find((x) => x.name === variant);
  values = valuesOf(program.genes, v?.values);
  $("name").textContent = `${program.file.name || "Untitled"}${v ? ` · ${v.name}` : ""}`;
  note.hidden = v === undefined;
  note.textContent = `Showing ${variant}: changes are written into its block. Its own genes are marked; ↺ puts one back to the creature's value.`;
  showGenes(program);
  inputs.show(program.live || program.backgroundLive);
  draw(!reframe);
}

/** Draws the creature; creatures that read time are drawn again every frame while it runs. */
function draw(keepView: boolean): void {
  cancelAnimationFrame(liveFrame);
  if (!shown || morphing) return;
  const { program } = shown;
  const { kind } = program.file;
  const built = paint(program, inputs.now() ?? {}, keepView);
  const problem = built.diagnostics[0];
  if (problem) say(problem.message);
  else if (kind === "background") say("A background.");
  else if (kind === "pattern") say("A pattern, on a ball.");
  else say(`${built.shapes.length} shape${built.shapes.length === 1 ? "" : "s"}`);
  const live = program.live || program.backgroundLive;
  if (live && inputs.running) liveFrame = requestAnimationFrame(() => draw(true));
}

/** Builds what's on show with the current values and puts it on the canvas. */
function paint(program: CheckResult, now: NonNullable<BuildOptions["inputs"]>, keepView: boolean) {
  const { kind } = program.file;
  const options = { genes: values, inputs: now };
  const built =
    kind === "creature"
      ? build(program, options)
      : kind === "pattern"
        ? build(ballWearing(program), options)
        : { shapes: [], diagnostics: [] };
  view.setCreature(built.shapes, keepView);
  if (!keepView && side) view.viewFrom(side);
  view.setBackground(kind === "pattern" ? undefined : buildBackground(program, options).fill);
  return built;
}

/** Starts or stops morphing. Stopping shows the creature, or the chosen variant, again. */
function setMorphing(on: boolean): void {
  if (!shown || on === morphing) return;
  morphing = on;
  morphButton.setAttribute("aria-pressed", String(on));
  $("morph-tools").hidden = !on;
  variantMenu.disabled = on;
  genes.inert = on;
  genes.classList.toggle("morphing", on);
  cancelAnimationFrame(liveFrame);
  cancelAnimationFrame(morphFrame);
  if (!on) {
    choose(shown.program, false);
    return;
  }
  note.hidden = true;
  $("name").textContent = shown.program.file.name || "Untitled";
  mutants = [];
  members = loopMembers(shown.program);
  position = 0;
  started = last = lastPanel = performance.now();
  morphStep(true);
}

/**
 * The creatures to morph through: the creature itself, then each variant in the order they're
 * written. A creature without variants morphs through mutants of itself, as in the app.
 */
function loopMembers(program: CheckResult): Member[] {
  const family: Member[] = [
    { label: program.file.name || "The creature", values: valuesOf(program.genes) },
    ...program.variants.map((v) => ({ label: v.name, values: valuesOf(program.genes, v.values) })),
  ];
  if (family.length > 1) return family;
  if (mutants.length === 0) {
    for (let i = 0; i < 5; i++) {
      mutants.push(
        mutate(program.genes, family[0]!.values, { strength: 0.25, random: Math.random }),
      );
    }
  }
  return [
    ...family,
    ...mutants.map((m, i) => ({ label: `Mutant ${i + 1}`, values: valuesOf(program.genes, m) })),
  ];
}

/** One frame of the morph: the in-between creature where the loop has got to. */
function morphStep(first = false): void {
  if (!shown || !morphing) return;
  const { program } = shown;
  const now = performance.now();
  const n = members.length;
  if (playing && !first) position += (now - last) / 1000 / (secondsEach * n);
  last = now;
  const x = (((position % 1) + 1) % 1) * n;
  const index = Math.min(Math.floor(x), n - 1);
  const a = members[index]!;
  const b = members[(index + 1) % n]!;
  values = morph(
    { genes: program.genes, values: a.values },
    { genes: program.genes, values: b.values },
    x - index,
  ).values;
  const built = paint(program, inputs.now() ?? { time: (now - started) / 1000 }, !first);
  if (first || now - lastPanel >= 200) {
    lastPanel = now;
    showGenes(program);
    const problem = built.diagnostics[0];
    say(problem ? problem.message : `${a.label} → ${b.label} · ${index + 1} of ${n}`);
  }
  morphFrame = requestAnimationFrame(() => morphStep());
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
  const own = morphing ? undefined : program.variants.find((v) => v.name === variant)?.values;
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
    text.textContent = text.title = formatValue(value);
    rows.push(row);
  }
  genes.replaceChildren(...rows);
  const count = program.genes.filter((g) => g.section !== "dance").length;
  $("gene-count").textContent = count > 0 ? String(count) : "";
}

function showValue(g: GeneInfo, v: Value): void {
  const cell = genes.querySelector<HTMLElement>(`tr[data-gene="${CSS.escape(g.fullName)}"] .value`);
  if (cell) cell.textContent = cell.title = formatValue(v);
}
