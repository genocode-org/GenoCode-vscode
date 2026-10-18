// Made by scripts/sections.mjs from @genocode/core's LANGUAGE.md. Don't edit it by hand.

/** The language guide on the website. */
export const GUIDE = "https://genocode-org.github.io/GenoCode/docs/language.html";

/** Each numbered section's anchor in the guide. */
export const SECTIONS: ReadonlyMap<string, string> = new Map([
  ["1", "1-overview"],
  ["2", "2-a-first-creature"],
  ["3", "3-files"],
  ["4", "4-lexical-structure"],
  ["5", "5-values-and-types"],
  ["6", "6-genes"],
  ["6.1", "61-declaring-genes"],
  ["6.2", "62-where-genes-can-go"],
  ["6.3", "63-full-names"],
  ["6.4", "64-colour-genes"],
  ["6.5", "65-part-genes"],
  ["6.6", "66-variants"],
  ["7", "7-variables"],
  ["8", "8-expressions"],
  ["8.1", "81-operators"],
  ["8.2", "82-vector-arithmetic"],
  ["8.3", "83-lists"],
  ["9", "9-control-flow"],
  ["10", "10-parts-and-functions"],
  ["11", "11-the-turtle"],
  ["11.1", "111-state-and-directions"],
  ["11.2", "112-moving"],
  ["11.3", "113-turning"],
  ["11.4", "114-growing-and-mirroring"],
  ["11.5", "115-branches"],
  ["11.6", "116-symmetry"],
  ["11.7", "117-the-shape-transform"],
  ["12", "12-shapes"],
  ["13", "13-colour-and-material"],
  ["13.1", "131-colours"],
  ["13.2", "132-material"],
  ["13.3", "133-gradients"],
  ["14", "14-textures"],
  ["14.1", "141-your-own-patterns"],
  ["15", "15-backgrounds"],
  ["16", "16-time-and-music"],
  ["17", "17-dance-styles"],
  ["18", "18-library"],
  ["18.1", "181-numbers"],
  ["18.2", "182-vectors"],
  ["18.3", "183-colours"],
  ["18.4", "184-reading-the-turtle"],
  ["18.5", "185-noise-and-randomness"],
  ["18.6", "186-lists"],
  ["18.7", "187-pictures"],
  ["18.8", "188-debugging"],
  ["19", "19-genetics"],
  ["19.1", "191-mutation"],
  ["19.2", "192-breeding"],
  ["19.3", "193-morphing"],
  ["19.4", "194-saving"],
  ["20", "20-building-a-creature"],
  ["21", "21-blocks"],
  ["22", "22-grammar"],
  ["23", "23-not-yet-settled"],
]);

/** A link to a section of the guide, such as `18.1`. */
export function sectionLink(section: string): string | undefined {
  const anchor = SECTIONS.get(section);
  return anchor ? `${GUIDE}#${anchor}` : undefined;
}
