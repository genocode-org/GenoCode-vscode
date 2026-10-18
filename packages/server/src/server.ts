// The language server: answers an editor's questions about the .genie files it has open.

import {
  createConnection,
  ProposedFeatures,
  TextDocuments,
  TextDocumentSyncKind,
  type Connection,
} from "vscode-languageserver/node";
import { TextDocument } from "vscode-languageserver-textdocument";
import {
  checkDocument,
  completions,
  diagnostics,
  foldingRanges,
  formatting,
  hover,
  symbols,
  type Checked,
} from "./service.js";

/** Starts a server on the connection the editor asked for (`--stdio`, `--node-ipc` or a socket). */
export function startServer(connection: Connection = createConnection(ProposedFeatures.all)): void {
  const documents = new TextDocuments(TextDocument);
  // The last check of each open file, so hover and completion don't check it again.
  const checked = new Map<string, Checked>();

  const checkedOf = (uri: string): Checked | undefined => {
    const document = documents.get(uri);
    if (!document) return undefined;
    const last = checked.get(uri);
    if (last && last.document.version === document.version) return last;
    const next = checkDocument(document);
    checked.set(uri, next);
    return next;
  };

  connection.onInitialize(() => ({
    capabilities: {
      textDocumentSync: TextDocumentSyncKind.Incremental,
      hoverProvider: true,
      completionProvider: { triggerCharacters: ["."] },
      documentFormattingProvider: true,
      documentSymbolProvider: { label: "GenoCode" },
      foldingRangeProvider: true,
    },
    serverInfo: { name: "GenoCode" },
  }));

  documents.onDidChangeContent(({ document }) => {
    const c = checkedOf(document.uri);
    if (c) void connection.sendDiagnostics({ uri: document.uri, diagnostics: diagnostics(c) });
  });
  documents.onDidClose(({ document }) => {
    checked.delete(document.uri);
    void connection.sendDiagnostics({ uri: document.uri, diagnostics: [] });
  });

  connection.onHover(({ textDocument, position }) => {
    const c = checkedOf(textDocument.uri);
    return c ? hover(c, position) : null;
  });
  connection.onCompletion(({ textDocument, position }) => {
    const c = checkedOf(textDocument.uri);
    return c ? completions(c, position) : [];
  });
  connection.onDocumentFormatting(({ textDocument }) => {
    const document = documents.get(textDocument.uri);
    if (!document) return null;
    const edits = formatting(document);
    if (edits) return edits;
    void connection.window.showWarningMessage(
      "This file has errors, so it can't be formatted. Fix them first.",
    );
    return null;
  });
  connection.onDocumentSymbol(({ textDocument }) => {
    const c = checkedOf(textDocument.uri);
    return c ? symbols(c) : null;
  });
  connection.onFoldingRanges(({ textDocument }) => {
    const document = documents.get(textDocument.uri);
    return document ? foldingRanges(document) : null;
  });

  documents.listen(connection);
  connection.listen();
}
