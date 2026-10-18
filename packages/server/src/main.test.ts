// Runs the built server (dist/main.js) as an editor would, over stdio.

import { spawn, type ChildProcess } from "node:child_process";
import { fileURLToPath } from "node:url";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const MAIN = fileURLToPath(new URL("../dist/main.js", import.meta.url));

/** A minimal LSP client: numbered requests, and every message the server sends. */
class Client {
  private buffer = Buffer.alloc(0);
  private next = 1;
  private readonly waiting: { test: (m: Message) => boolean; resolve: (m: Message) => void }[] = [];
  readonly received: Message[] = [];

  constructor(private readonly server: ChildProcess) {
    server.stdout!.on("data", (chunk: Buffer) => {
      this.buffer = Buffer.concat([this.buffer, chunk]);
      for (;;) {
        const end = this.buffer.indexOf("\r\n\r\n");
        if (end < 0) return;
        const length = Number(
          /Content-Length: (\d+)/.exec(this.buffer.subarray(0, end).toString())![1],
        );
        if (this.buffer.length < end + 4 + length) return;
        const message = JSON.parse(
          this.buffer.subarray(end + 4, end + 4 + length).toString(),
        ) as Message;
        this.buffer = this.buffer.subarray(end + 4 + length);
        this.received.push(message);
        const i = this.waiting.findIndex((w) => w.test(message));
        if (i >= 0) this.waiting.splice(i, 1)[0]!.resolve(message);
      }
    });
  }

  send(message: object): void {
    const body = JSON.stringify({ jsonrpc: "2.0", ...message });
    this.server.stdin!.write(`Content-Length: ${Buffer.byteLength(body)}\r\n\r\n${body}`);
  }

  wait(test: (m: Message) => boolean): Promise<Message> {
    const found = this.received.find(test);
    if (found) return Promise.resolve(found);
    return new Promise((resolve) => this.waiting.push({ test, resolve }));
  }

  async request(method: string, params: object): Promise<unknown> {
    const id = this.next++;
    this.send({ id, method, params });
    return (await this.wait((m) => m.id === id)).result;
  }
}

interface Message {
  id?: number;
  method?: string;
  params?: { uri?: string; diagnostics?: { message: string }[] };
  result?: unknown;
}

const URI = "file:///Bad.genie";
let server: ChildProcess;
let client: Client;

beforeAll(async () => {
  server = spawn(process.execPath, [MAIN, "--stdio"], { stdio: ["pipe", "pipe", "inherit"] });
  client = new Client(server);
  await client.request("initialize", { processId: null, rootUri: null, capabilities: {} });
  client.send({ method: "initialized", params: {} });
});

afterAll(() => {
  server.kill();
});

describe("the language server", () => {
  it("reports errors in an opened file", async () => {
    client.send({
      method: "textDocument/didOpen",
      params: {
        textDocument: {
          uri: URI,
          languageId: "genocode",
          version: 1,
          text: "creature Bad\n\nforward nowhere\n",
        },
      },
    });
    const published = await client.wait(
      (m) => m.method === "textDocument/publishDiagnostics" && m.params?.uri === URI,
    );
    expect(published.params?.diagnostics?.[0]?.message).toMatch(/nowhere/);
  });

  it("answers hover and formatting requests", async () => {
    const hover = (await client.request("textDocument/hover", {
      textDocument: { uri: URI },
      position: { line: 2, character: 2 },
    })) as { contents: { value: string } };
    expect(hover.contents.value).toContain("forward");

    client.send({
      method: "textDocument/didChange",
      params: {
        textDocument: { uri: URI, version: 2 },
        contentChanges: [{ text: "creature Good\n\nforward   1\n" }],
      },
    });
    const edits = await client.request("textDocument/formatting", {
      textDocument: { uri: URI },
      options: { tabSize: 2, insertSpaces: true },
    });
    expect(edits).toEqual([
      {
        range: { start: { line: 0, character: 0 }, end: { line: 3, character: 0 } },
        newText: "creature Good\n\nforward 1\n",
      },
    ]);
  });

  it("follows edits made in place", async () => {
    // A line added above the code moves everything after it.
    client.send({
      method: "textDocument/didChange",
      params: {
        textDocument: { uri: URI, version: 3 },
        contentChanges: [
          {
            range: { start: { line: 1, character: 0 }, end: { line: 1, character: 0 } },
            text: "let n = floor(nothing)\n",
          },
        ],
      },
    });
    const published = await client.wait(
      (m) =>
        m.method === "textDocument/publishDiagnostics" &&
        m.params?.uri === URI &&
        (m.params.diagnostics ?? []).some((d) => /nothing/.test(d.message)),
    );
    expect(published.params?.diagnostics?.length).toBe(1);
    const hover = (await client.request("textDocument/hover", {
      textDocument: { uri: URI },
      position: { line: 3, character: 2 },
    })) as { contents: { value: string } };
    expect(hover.contents.value).toContain("forward");
    const floor = (await client.request("textDocument/hover", {
      textDocument: { uri: URI },
      position: { line: 1, character: 9 },
    })) as { contents: { value: string } };
    expect(floor.contents.value).toContain("floor(x)");
  });
});
