# GenoCode-vscode: notes for Claude

The GenoCode VS Code extension (`packages/vscode`) and its language server (`packages/server`),
built on `@genocode/core` from npm. See [README.md](README.md) for what they do.

## Commands

- `npm run check`: build, type-check, test and check formatting, as CI does. Run it before every
  pull request.
- `npm run package`: build the `.vsix` in `packages/vscode`.
- `npx vitest run <file>`: run one test file.
- To try the extension, open `packages/vscode` in VS Code and press F5.

## Rules to follow

- **Branches and pull requests.** `main` is protected: every change goes through a pull request
  from a branch named `type/short-topic` (`feat`, `fix`, `docs`, `chore` or `release`), filling in
  the pull request template. Pull requests are squash-merged. The full rules are in
  [GenoCode's CONTRIBUTING.md](https://github.com/genocode-org/GenoCode/blob/main/CONTRIBUTING.md).
- **Changes that need a new core.** If a change needs something new in `@genocode/core` or
  `@genocode/render`, make it in the GenoCode repository first, with the same branch name, and
  release it there. Until then, try it with `npm link ../GenoCode/packages/core`.
- **One space between things.** Any code a tool writes or changes puts one space between things:
  no column alignment, no two spaces before a comment. Indentation (2 spaces) stays. Spacing a
  person types by hand is theirs.
- **Text is for a first-time user.** Messages, help and settings say in plain words what they do,
  with no jargon the user has not met and no "as in the original".
- **Nothing from DancerDNA,** and nothing that refers to files outside this repository.
- The language itself is defined in GenoCode's
  [docs/LANGUAGE.md](https://github.com/genocode-org/GenoCode/blob/main/docs/LANGUAGE.md).
