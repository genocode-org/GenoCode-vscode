<p align="center"><img src="https://raw.githubusercontent.com/genocode-org/GenoCode/main/branding/logo-lockup.svg" alt="GenoCode" width="480"></p>

# GenoCode-vscode

The VS Code extension and language server for [GenoCode](https://github.com/genocode-org/GenoCode):
highlighting, errors as you type, formatting and more for `.genie` files.

**Status: not started.** This repository holds the package's setup. The extension is built in
phase 10 of GenoCode's roadmap, on top of [`@genocode/core`](https://www.npmjs.com/package/@genocode/core),
the same parser, checker and formatter the web app uses. It will be published to the VS Code
Marketplace and Open VSX.

## Development

You need Node.js 22 or later (see `.nvmrc`).

```
npm install
npm run check     # build, type-check, test and check formatting, as CI does
```

## License

Released under the [MIT License](LICENSE). See [CREDITS.md](CREDITS.md).
