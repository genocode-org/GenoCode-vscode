# Changes

## 0.6.2

- Uses GenoCode 0.10.1: corrected language guide, a clearer message when a pattern block uses
  something from outside it, and new Marbled (Flowerball) and Swirled (Starfish) variants.

## 0.6.1

- Uses GenoCode 0.10.0. The new `breed off` line (a creature whose children don't keep its look)
  is coloured, explained on hover and checked.

## 0.6.0

- The preview edits variants. While a variant is shown, moving a gene's control writes the new
  value into the variant's block, adding a line for a gene it didn't set. The genes the variant
  sets itself are marked, and ↺ takes one back to the creature's own value.
- The preview follows the cursor: in a variant's block it shows that variant, and on a gene's line
  the creature itself. Picking a variant in the preview's menu moves the cursor to its block.
- Front, Back, Left, Right, Top and Bottom buttons in the preview, as in the app. Picking another
  variant frames it afresh, from the side last chosen, instead of keeping the last one's zoom.

## 0.5.2

- Uses GenoCode 0.9.4. The preview's ball for pattern files now comes from GenoCode itself, the
  same one the app and the command line draw. Nothing you see changes.

## 0.5.1

- Hover help, completion, errors, go to definition and rename follow the file as it's edited.
  Since 0.1.0 they kept using the file as it was when it was opened, so after an edit they
  could describe the wrong word, or show errors that had already been fixed.
- Help on hover for pattern code: `pattern`, `picture` and `value`, the pixel's `x`, `y`, `r`
  and `a`, and your own pattern names. Completion inside a pattern block offers the pattern's
  names, not the creature's.

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
