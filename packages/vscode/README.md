# GenoCode for VS Code

Write [GenoCode](https://genocode-org.github.io/GenoCode/) creatures and patterns in VS Code. GenoCode is a small
language for growing 3D creatures with a turtle, breeding them through their genes and making them
dance to music. Creature files end in `.genie`.

## What you get

- **A live 3D preview** beside the editor (Ctrl+K V, or the preview button above the editor):
  the creature as you type it, with a control for each gene that writes its value into the code
  when you let go, a menu of its variants, and sliders for time and music. A pattern file is
  shown as a ball wearing it.
- **Colours** for keywords, genes, parts, built-in functions, colour names, numbers and comments.
- **Errors as you type**, with the same checker the GenoCode app uses.
- **Help on hover** for every keyword, built-in, gene and part, with a link to its section of the
  [language guide](https://genocode-org.github.io/GenoCode/docs/language.html).
- **Completion** of everything in scope: genes, parts, variables, built-ins and keywords, and the
  parts of `music.` and `turtle.`.
- **Formatting** in GenoCode's standard layout (Format Document, or format on save).
- **Go to definition, find references and rename** for genes, parts, functions, patterns and
  variables. Renaming a gene asks first, since other creatures match genes by their full names.
- **Colour swatches and a colour picker** beside `hsv(…)`, `rgb(…)`, hex colours and colour
  names. A picked colour is written back the way it was written.
- **Outline** of the creature's genes, parts, functions, patterns, variants, background and
  dance, for the Outline view, breadcrumbs and Go to Symbol.
- **Folding** of blocks and long comments.

To breed, morph and dance your creature, open it in the
[GenoCode app](https://genocode-org.github.io/GenoCode/), or render it with the [`genie` command line](https://github.com/genocode-org/GenoCode-cli).

## Other editors

The editor support is a language server, `genie-language-server`, so any editor that speaks the
Language Server Protocol can use it. See
[GenoCode-vscode](https://github.com/genocode-org/GenoCode-vscode).

## License

[MIT](LICENSE).
