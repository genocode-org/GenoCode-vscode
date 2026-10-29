// Code pasted into a .genie file comes in with one space between things, as in the GenoCode app.
// The paste widget still offers the text as it was copied.

import { singleSpaced } from "@genocode/core";
import {
  DocumentDropOrPasteEditKind,
  DocumentPasteEdit,
  languages,
  type DocumentPasteEditProvider,
  type Disposable,
} from "vscode";

const KIND = DocumentDropOrPasteEditKind.Text.append("genocode", "singleSpaced");

const provider: DocumentPasteEditProvider = {
  async provideDocumentPasteEdits(_document, _ranges, dataTransfer) {
    const text = await dataTransfer.get("text/plain")?.asString();
    if (text === undefined) return undefined;
    const spaced = singleSpaced(text);
    // Text that's already single-spaced pastes as usual, with no widget.
    if (spaced === text) return undefined;
    return [new DocumentPasteEdit(spaced, "Paste with one space between things", KIND)];
  },
};

/** Has pastes into GenoCode files come in with one space between things. */
export function registerPaste(): Disposable {
  return languages.registerDocumentPasteEditProvider({ language: "genocode" }, provider, {
    providedPasteEditKinds: [KIND],
    pasteMimeTypes: ["text/plain"],
  });
}
