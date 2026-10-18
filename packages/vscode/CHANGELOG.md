# Changes

## 0.5.1

- Hover help, completion, errors, go to definition and rename follow the file as it's edited.
  Since 0.1.0 they kept using the file as it was when it was opened, so after an edit they
  could describe the wrong word, or show errors that had already been fixed.

## 0.5.0

- Patterns written in GenoCode (GenoCode 0.9): pattern files (`pattern Ripples`) and
  `pattern Ripples { … }` blocks in creatures. `picture`, `value` and the picture functions
  (`clouds`, `blur`, `zoom_blur`, `stretch`, `power`) are coloured, with help on hover and
  completion, and patterns appear in the outline with their genes.
- The preview shows a pattern file as a ball wearing it, with a control for each of its genes, and
  draws creatures that wear their own patterns.
- Renaming a pattern renames it in variants' full gene names too, and warns that they change.
- Help links reach the guide's new sections, such as Lists, Pictures and Your own patterns.

## 0.4.0

- A live 3D preview beside the editor (GenoCode: Open Preview to the Side, Ctrl+K V, or the
  preview button above the editor). It draws the creature as you type and follows the active
  `.genie` file. Each gene has a control: dragging shows the change at once, and letting go
  writes the new value into the code. Variants can be shown from a menu, and creatures that read
  time or music get sliders for them.

## 0.3.0

- Colour swatches beside colours written out in full (`hsv(…)`, `rgb(…)`, hex colours and
  colour names), with VS Code's colour picker. A picked colour is written back the way the colour
  was written.

## 0.2.0

- Go to definition (F12, or Ctrl+click), find all references (Shift+F12) and highlighting of a
  name's other uses, for genes, parts, functions and variables.
- Rename (F2) everywhere, gene names in variants included. Names that are keywords, built in,
  already used, or that would hide another name are refused. Renaming a gene, or a part with
  genes, asks first, since other creatures match genes by their full names.

## 0.1.1

- Hover help links to the language guide where it really is, so the links open the right section.
- Hover help for dance effect lines (`morph follows …`, `speed`, `settle` and the rest).

## 0.1.0

- First release: colours, errors as you type, help on hover, completion, formatting, outline and
  folding for `.genie` files.
