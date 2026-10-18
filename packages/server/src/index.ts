// The GenoCode language server, and the functions behind it for editors that don't speak LSP.

export { startServer } from "./server.js";
export {
  checkDocument,
  completions,
  diagnostics,
  foldingRanges,
  formatting,
  hover,
  symbols,
  type Checked,
} from "./service.js";
export { GUIDE, sectionLink } from "./sections.js";
