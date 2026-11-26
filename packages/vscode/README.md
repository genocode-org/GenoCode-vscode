# GenoCode for VS Code

Write [GenoCode](https://genocode.piorek.co.za/) creatures and patterns in VS Code. GenoCode is a small
language for growing 3D creatures with a turtle, breeding them through their genes and making them
dance to music. Creature files end in `.genie`.

## What you get

- **A live 3D preview** beside the editor (Ctrl+K V, or the preview button above the editor):
  the creature as you type it, with a control for each gene that writes its value into the code
  when you let go, a menu of its variants, and sliders for time and music. **Make a variant…**
  turns the genes you've changed since saving into a new variant, and **New variant…** in the
  menu starts an empty one. **Morph** blends the creature into each of its variants in turn (or
  into mutants of it). The preview follows the cursor: inside a variant's block it shows that
  variant. Buttons turn it to the front, back, sides, top or bottom. A pattern file is shown as a
  ball wearing it.
- **Colours** for keywords, genes, parts, built-in functions, colour names, numbers and comments.
- **Errors as you type**, with the same checker the GenoCode app uses.
- **Help on hover** for every keyword, built-in, gene and part, with a link to its section of the
  [language guide](https://genocode.piorek.co.za/docs/language.html).
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
- **Tidy pasting:** code pasted into a `.genie` file comes in with one space between things. The
  paste menu still offers the text as it was copied.

To breed and dance your creature, open it in the
[GenoCode app](https://genocode.piorek.co.za/app/), or render it with the [`genie` command line](https://github.com/genocode-org/GenoCode-cli).

## Other editors

The extension is also on [Open VSX](https://open-vsx.org/extension/genocode/genocode), for
VSCodium and other editors built on VS Code. The errors, hover help, completion, formatting and
the rest come from a language server, so any editor that speaks the Language Server Protocol
can use them too: see
[GenoCode-vscode](https://github.com/genocode-org/GenoCode-vscode#other-editors) for how to build
and run it.

## License

[MIT](LICENSE).
