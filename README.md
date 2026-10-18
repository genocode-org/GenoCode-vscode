<p align="center"><img src="https://raw.githubusercontent.com/genocode-org/GenoCode/main/branding/logo-lockup.svg" alt="GenoCode" width="480"></p>

# GenoCode-vscode

The VS Code extension and language server for [GenoCode](https://github.com/genocode-org/GenoCode):
colours, errors as you type, help on hover, completion, outline, folding and formatting for `.genie`
files. Both are built on [`@genocode/core`](https://www.npmjs.com/package/@genocode/core), the same
parser, checker and formatter the web app uses.

| Package                              | What it is                                                                          |
| ------------------------------------ | ----------------------------------------------------------------------------------- |
| [`packages/server`](packages/server) | `@genocode/language-server`: the language server, `genie-language-server --stdio`   |
| [`packages/vscode`](packages/vscode) | `genocode.genocode`: the VS Code extension, with the grammar and the server bundled |

The grammar (`packages/vscode/scripts/grammar.mjs`) is made from core's own lists of keywords and
built-in names when the extension is built. The links from hover help to the language guide come
from `packages/server/src/sections.ts`; run `npm run sections` after moving to a version of core
whose guide has new sections (a test says when).

## Development

You need Node.js 22 or later (see `.nvmrc`).

```
npm install
npm run check     # build, type-check, test and check formatting, as CI does
npm run package   # build packages/vscode/genocode-<version>.vsix
```

To try the extension, open `packages/vscode` in VS Code and press F5, or install the `.vsix` with
`code --install-extension packages/vscode/genocode-0.1.0.vsix`.

## Other editors

Any editor that speaks the Language Server Protocol can run `genie-language-server --stdio` for
files ending in `.genie`.

## License

Released under the [MIT License](LICENSE). See [CREDITS.md](CREDITS.md).
