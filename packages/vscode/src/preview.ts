// The live preview: a panel beside the editor that draws the creature in the active .genie file
// as it's typed, with a control for each gene and sliders for time and music. The drawing happens
// in the panel (src/webview/main.ts); this side sends it the text and writes its gene edits back.

import {
  Disposable,
  Range,
  Selection,
  TextEditorRevealType,
  Uri,
  ViewColumn,
  window,
  workspace,
  WorkspaceEdit,
  type ExtensionContext,
  type TextDocument,
  type WebviewPanel,
} from "vscode";

/** What the panel sends. */
type FromPanel =
  | { type: "ready" }
  | { type: "edit"; version: number; edits: { start: number; end: number; text: string }[] }
  | { type: "reveal"; version: number; at: number };

const isGenie = (d: TextDocument) => d.languageId === "genocode";

export class Preview {
  private static current: Preview | undefined;
  private document: TextDocument;
  private readonly disposables: Disposable[] = [];
  private pending: ReturnType<typeof setTimeout> | undefined;

  /** Shows the preview beside the editor, for `document`. */
  static show(context: ExtensionContext, document: TextDocument): void {
    if (Preview.current) {
      Preview.current.panel.reveal(undefined, true);
      Preview.current.follow(document);
      return;
    }
    const panel = window.createWebviewPanel(
      "genocode.preview",
      "Preview",
      { viewColumn: ViewColumn.Beside, preserveFocus: true },
      {
        enableScripts: true,
        retainContextWhenHidden: true,
        localResourceRoots: [Uri.joinPath(context.extensionUri, "dist")],
      },
    );
    Preview.current = new Preview(context, panel, document);
  }

  private constructor(
    context: ExtensionContext,
    private readonly panel: WebviewPanel,
    document: TextDocument,
  ) {
    this.document = document;
    panel.iconPath = Uri.joinPath(context.extensionUri, "images", "file.svg");
    panel.webview.html = page(panel, context.extensionUri);
    this.title();
    this.disposables.push(
      panel.onDidDispose(() => this.dispose()),
      panel.webview.onDidReceiveMessage((m: FromPanel) => void this.receive(m)),
      workspace.onDidChangeTextDocument((e) => {
        if (e.document === this.document) this.sendSoon();
      }),
      window.onDidChangeActiveTextEditor((editor) => {
        if (editor && isGenie(editor.document)) this.follow(editor.document);
      }),
      // The panel shows the variant whose block the cursor is in.
      window.onDidChangeTextEditorSelection((e) => {
        const doc = e.textEditor.document;
        if (doc !== this.document) return;
        const at = doc.offsetAt(e.selections[0]!.active);
        void this.panel.webview.postMessage({ type: "cursor", at, version: doc.version });
      }),
    );
  }

  /** Shows another file. */
  private follow(document: TextDocument): void {
    if (document === this.document) return;
    this.document = document;
    this.title();
    this.send();
  }

  private title(): void {
    this.panel.title = `Preview ${this.document.uri.path.split("/").pop()}`;
  }

  /** Sends the text after a short pause in typing, so the creature isn't rebuilt on every key. */
  private sendSoon(): void {
    clearTimeout(this.pending);
    this.pending = setTimeout(() => this.send(), 150);
  }

  private send(): void {
    clearTimeout(this.pending);
    void this.panel.webview.postMessage({
      type: "show",
      text: this.document.getText(),
      version: this.document.version,
    });
  }

  private async receive(m: FromPanel): Promise<void> {
    if (m.type === "ready") {
      this.send();
      return;
    }
    if (m.type === "reveal") {
      // A variant picked in the panel: its block is shown in the editor, which keeps its focus.
      const editor = window.visibleTextEditors.find((e) => e.document === this.document);
      if (!editor || m.version !== this.document.version) return;
      const at = this.document.positionAt(m.at);
      editor.selection = new Selection(at, at);
      editor.revealRange(new Range(at, at), TextEditorRevealType.InCenterIfOutsideViewport);
      return;
    }
    // Edits are for the text the panel was sent; if it has changed since, they'd land wrongly.
    if (m.version !== this.document.version || m.edits.length === 0) return;
    const doc = this.document;
    const edit = new WorkspaceEdit();
    for (const e of m.edits) {
      edit.replace(doc.uri, new Range(doc.positionAt(e.start), doc.positionAt(e.end)), e.text);
    }
    await workspace.applyEdit(edit);
  }

  private dispose(): void {
    Preview.current = undefined;
    clearTimeout(this.pending);
    for (const d of this.disposables) d.dispose();
  }
}

/** The panel's page: the bundled script and styles, allowed by a content security policy. */
function page(panel: WebviewPanel, extension: Uri): string {
  const webview = panel.webview;
  const asset = (name: string) => webview.asWebviewUri(Uri.joinPath(extension, "dist", name));
  const nonce = [...crypto.getRandomValues(new Uint8Array(16))]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  const csp = [
    "default-src 'none'",
    `img-src ${webview.cspSource} data: blob:`,
    `style-src ${webview.cspSource} 'unsafe-inline'`,
    // 'unsafe-eval' lets patterns written in GenoCode run their per-pixel code as JavaScript;
    // without it they'd fall back to slower closures. Only the bundled script can run.
    `script-src 'nonce-${nonce}' 'unsafe-eval'`,
  ].join("; ");
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta http-equiv="Content-Security-Policy" content="${csp}">
<meta name="viewport" content="width=device-width, initial-scale=1">
<link rel="stylesheet" href="${asset("preview.css")}">
</head>
<body>
<main id="view">
  <canvas id="canvas"></canvas>
  <div id="title" class="floating">
    <span id="name"></span>
    <span id="status"></span>
  </div>
  <div id="corner">
    <button id="camera" class="icon floating" aria-haspopup="menu" aria-expanded="false" aria-label="Look from another side" title="Look from another side">
      <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3l8 4.5v9L12 21l-8-4.5v-9z"/><path d="M12 12l8-4.5M12 12v9M12 12L4 7.5"/></svg>
    </button>
    <div id="camera-menu" class="menu floating" role="menu" hidden>
      <div class="menu-head">Look from</div>
      <div class="sides">
        <button data-side="front" role="menuitem">Front</button>
        <button data-side="back" role="menuitem">Back</button>
        <button data-side="top" role="menuitem">Top</button>
        <button data-side="left" role="menuitem">Left</button>
        <button data-side="right" role="menuitem">Right</button>
        <button data-side="bottom" role="menuitem">Bottom</button>
      </div>
      <hr>
      <button id="reset" class="item" role="menuitem" title="Frame the whole creature again">
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 12a8 8 0 1 0 2.3-5.7M4 4v4h4"/></svg>
        Start the view again
      </button>
    </div>
  </div>
  <div id="bar" class="floating" hidden>
    <label class="chip" title="The creature itself, or one of its variants">
      <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="6" cy="12" r="3"/><circle cx="18" cy="6" r="3"/><circle cx="18" cy="18" r="3"/><path d="M9 11l6-4M9 13l6 4"/></svg>
      <select id="variant" aria-label="Variant"></select>
    </label>
  </div>
</main>
<aside id="panel">
  <h2>Genes <span id="gene-count"></span></h2>
  <p id="note" hidden></p>
  <table id="genes"></table>
  <section id="inputs" hidden>
    <h2>
      <button id="inputs-toggle" aria-expanded="false" title="Try how the creature reacts to time and music">
        Try inputs
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 6l6 6-6 6"/></svg>
      </button>
    </h2>
  </section>
</aside>
<script nonce="${nonce}" src="${asset("preview.js")}"></script>
</body>
</html>`;
}
