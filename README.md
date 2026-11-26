<p align="center"><img src="https://raw.githubusercontent.com/genocode-org/GenoCode/main/branding/logo-lockup.svg" alt="GenoCode" width="480"></p>

# GenoCode-vscode

The VS Code extension and language server for [GenoCode](https://github.com/genocode-org/GenoCode):
colours, errors as you type, help on hover, completion, go to definition, find references, rename,
colour swatches and a colour picker, outline, folding and formatting for `.genie` files, and a live
3D preview. Both are built on [`@genocode/core`](https://www.npmjs.com/package/@genocode/core), the same
parser, checker and formatter the web app uses.

| Package                              | What it is                                                                          |
| ------------------------------------ | ----------------------------------------------------------------------------------- |
| [`packages/server`](packages/server) | `@genocode/language-server`: the language server, `genie-language-server --stdio`   |
| [`packages/vscode`](packages/vscode) | `genocode.genocode`: the VS Code extension, with the grammar and the server bundled |

The grammar (`packages/vscode/scripts/grammar.mjs`) is made from core's own lists of keywords and
built-in names when the extension is built. The links from hover help to the language guide come
from `packages/server/src/sections.ts`; run `npm run sections` after moving to a version of core
whose guide has new sections (a test says when).

## Install

Install **GenoCode** from the
[VS Code Marketplace](https://marketplace.visualstudio.com/items?itemName=genocode.genocode), or
from [Open VSX](https://open-vsx.org/extension/genocode/genocode) for VSCodium and other editors
built on VS Code. Each [release](https://github.com/genocode-org/GenoCode-vscode/releases) also has
the `.vsix` file, to install by hand.

## Development

You need Node.js 22 or later (see `.nvmrc`).

```
npm install
npm run check
npm run package
```

`npm run check` builds, type-checks, tests and checks formatting, as CI does. `npm run package`
builds `packages/vscode/genocode-<version>.vsix`.

To try the extension, open `packages/vscode` in VS Code and press F5, or install the `.vsix` with
`code --install-extension packages/vscode/genocode-<version>.vsix`.

Contributions follow GenoCode's
[CONTRIBUTING.md](https://github.com/genocode-org/GenoCode/blob/main/CONTRIBUTING.md).

## Releasing

Bump `version` in `packages/vscode/package.json`, add the changes to
`packages/vscode/CHANGELOG.md`, commit, and push a tag with the same version, such as `v0.14.3`.
The release workflow publishes the extension to the VS Code Marketplace and Open VSX, and attaches
the `.vsix` to a GitHub release.

## Other editors

Any editor that speaks the Language Server Protocol can use the language server for files ending
in `.genie`. It isn't on npm yet, so build it from this repository (`npm install`, then
`npm run build`) and have the editor run `node packages/server/dist/main.js --stdio`.

## License

Released under the [MIT License](LICENSE). See [CREDITS.md](CREDITS.md).
