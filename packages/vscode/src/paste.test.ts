import { describe, expect, it, vi } from "vitest";

// The parts of the VS Code API the paste provider uses, with the provider kept for the test.
const registered = vi.hoisted(() => ({ provider: undefined as any, metadata: undefined as any }));
vi.mock("vscode", () => {
  class Kind {
    constructor(readonly value: string) {}
    static Text = new Kind("text");
    append(...parts: string[]) {
      return new Kind([this.value, ...parts].join("."));
    }
  }
  class DocumentPasteEdit {
    constructor(
      readonly insertText: string,
      readonly title: string,
      readonly kind: Kind,
    ) {}
  }
  return {
    DocumentDropOrPasteEditKind: Kind,
    DocumentPasteEdit,
    languages: {
      registerDocumentPasteEditProvider: (
        _selector: unknown,
        provider: unknown,
        metadata: unknown,
      ) => {
        registered.provider = provider;
        registered.metadata = metadata;
        return { dispose() {} };
      },
    },
  };
});

const { registerPaste } = await import("./paste.js");
registerPaste();

const paste = (text: string | undefined) =>
  registered.provider.provideDocumentPasteEdits(undefined, [], {
    get: (mime: string) =>
      mime === "text/plain" && text !== undefined ? { asString: async () => text } : undefined,
  });

describe("paste", () => {
  it("pastes code with one space between things", async () => {
    const [edit] = await paste("gene hue    = 200   in 0..360    // its colour\n");
    expect(edit.insertText).toBe("gene hue = 200 in 0..360 // its colour\n");
    expect(edit.kind.value).toBe("text.genocode.singleSpaced");
    expect(registered.metadata.pasteMimeTypes).toEqual(["text/plain"]);
  });

  it("leaves single-spaced text and other pastes to VS Code", async () => {
    expect(await paste("gene hue = 200 in 0..360\n")).toBeUndefined();
    expect(await paste(undefined)).toBeUndefined();
  });
});
