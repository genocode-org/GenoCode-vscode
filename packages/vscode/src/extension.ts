// The VS Code extension: starts the GenoCode language server for .genie files, and opens the live
// preview. Colours come from the grammar, and everything else (errors, hover help, completion,
// outline, formatting) from the server.

import { commands, window, type ExtensionContext } from "vscode";
import {
  LanguageClient,
  TransportKind,
  type LanguageClientOptions,
  type ServerOptions,
} from "vscode-languageclient/node";
import { Preview } from "./preview.js";

let client: LanguageClient | undefined;

export async function activate(context: ExtensionContext): Promise<void> {
  context.subscriptions.push(
    commands.registerCommand("genocode.showPreview", () => {
      const editor = window.activeTextEditor;
      if (editor?.document.languageId === "genocode") Preview.show(context, editor.document);
    }),
  );

  const module = context.asAbsolutePath("dist/server.cjs");
  const server: ServerOptions = {
    run: { module, transport: TransportKind.ipc },
    debug: { module, transport: TransportKind.ipc, options: { execArgv: ["--inspect=6009"] } },
  };
  const options: LanguageClientOptions = {
    documentSelector: [{ language: "genocode" }],
  };
  client = new LanguageClient("genocode", "GenoCode", server, options);
  await client.start();
}

export async function deactivate(): Promise<void> {
  await client?.stop();
}
