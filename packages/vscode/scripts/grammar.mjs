// The TextMate grammar that colours .genie files. It's made from @genocode/core's own lists of
// keywords and built-in names, so it follows the language as core changes (docs/LANGUAGE.md 4).

import {
  BUILTIN_CONSTANTS,
  BUILTIN_FUNCTIONS,
  FINISHES,
  FUNCTION_HELP,
  KEYWORDS,
  MIX_WAYS,
  NAMED_COLOURS,
  PATTERN_KINDS,
  SCHEMES,
  SHAPES,
} from "@genocode/core";

const NAME = "[\\p{L}_][\\p{L}\\p{N}_]*";

/** The keywords, by what they do. Every keyword must be in exactly one group (grammar.test.ts). */
export const KEYWORD_GROUPS = {
  "storage.type": ["creature", "gene", "part", "function", "let", "variant", "background", "dance"],
  "keyword.control": ["if", "else", "repeat", "for", "while", "return"],
  "keyword.other": ["as", "from", "to", "by", "in", "step", "log", "at"],
  "keyword.other.command": [
    "branch",
    "lay",
    "reshape",
    "symmetric",
    "shape",
    "colour",
    "color",
    "shine",
    "sharpness",
    "wear",
    "texture",
    "fill",
    "forward",
    "back",
    "move",
    "pitch",
    "yaw",
    "roll",
    "rotate",
    "around",
    "grow",
    "mirror",
    "print",
  ],
  "keyword.operator.logical": ["and", "or", "not"],
  "constant.language.boolean": ["true", "false"],
  "variable.language": ["turtle", "time", "beat", "music"],
};

/** The words of a dance block's effect lines (section 17). */
const EFFECTS = ["morph", "zoom", "spin", "turn", "reverse", "flat"];
const EFFECT_WORDS = ["follows", "speed", "settle", "amount", "smooth", "on", "off"];
const TRIGGER_WORDS = ["changes", "drops", "rises"];

const words = (list) => `\\b(?:${[...list].sort((a, b) => b.length - a.length).join("|")})\\b`;

/** The grammar, as the JSON VS Code reads. */
export function grammar() {
  const keywordNames = Object.values(KEYWORD_GROUPS).flat();
  const missing = [...KEYWORDS].filter((k) => !keywordNames.includes(k));
  if (missing.length > 0) throw new Error(`Keywords without a colour: ${missing.join(", ")}`);

  const functions = [...FUNCTION_HELP.keys(), ...BUILTIN_FUNCTIONS.keys()];
  const colours = [...NAMED_COLOURS.keys()];
  const words_ = new Set([...SHAPES, ...PATTERN_KINDS, ...SCHEMES, ...FINISHES, ...MIX_WAYS]);
  const others = [...BUILTIN_CONSTANTS.keys()].filter(
    (k) => !colours.includes(k) && !words_.has(k),
  );

  return {
    $schema: "https://raw.githubusercontent.com/martinring/tmlanguage/master/tmlanguage.json",
    name: "GenoCode",
    scopeName: "source.genocode",
    fileTypes: ["genie"],
    patterns: [{ include: "#comments" }, { include: "#declarations" }, { include: "#code" }],
    repository: {
      comments: {
        patterns: [
          {
            name: "comment.block.genocode",
            begin: "/\\*",
            end: "\\*/",
            beginCaptures: { 0: { name: "punctuation.definition.comment.genocode" } },
            endCaptures: { 0: { name: "punctuation.definition.comment.genocode" } },
          },
          {
            name: "comment.line.double-slash.genocode",
            match: "(//).*$",
            captures: { 1: { name: "punctuation.definition.comment.genocode" } },
          },
        ],
      },
      declarations: {
        patterns: [
          {
            // `creature Star`, `background Night`, `dance Groove`, `variant Spring`
            match: `\\b(creature|background|dance|variant)\\s+(${NAME})`,
            captures: {
              1: { name: "storage.type.genocode" },
              2: { name: "entity.name.type.genocode" },
            },
          },
          {
            match: `\\b(part|function)\\s+(${NAME})`,
            captures: {
              1: { name: "storage.type.genocode" },
              2: { name: "entity.name.function.genocode" },
            },
          },
          {
            match: `\\b(gene)\\s+(${NAME})`,
            captures: {
              1: { name: "storage.type.genocode" },
              2: { name: "variable.other.constant.gene.genocode" },
            },
          },
          {
            match: `\\b(let)\\s+(${NAME})`,
            captures: {
              1: { name: "storage.type.genocode" },
              2: { name: "variable.other.declaration.genocode" },
            },
          },
          {
            // `mirror x`, `symmetric z`
            match: "\\b(mirror|symmetric)\\s+([xyz])\\b",
            captures: {
              1: { name: "keyword.other.command.genocode" },
              2: { name: "constant.language.axis.genocode" },
            },
          },
          {
            // A dance effect line: `spin follows music.bass_hit from 45 to 170 smooth 0.4`
            begin: `^\\s*(${EFFECTS.join("|")})\\s+(?=(?:follows|on)\\b)`,
            end: "(?=$|;|//|/\\*)",
            beginCaptures: { 1: { name: "keyword.other.effect.genocode" } },
            patterns: [
              { match: words(EFFECT_WORDS), name: "keyword.other.setting.genocode" },
              { match: words(TRIGGER_WORDS), name: "keyword.other.trigger.genocode" },
              { include: "#code" },
            ],
          },
        ],
      },
      code: {
        patterns: [
          { include: "#comments" },
          { include: "#strings" },
          { include: "#members" },
          ...Object.entries(KEYWORD_GROUPS).map(([scope, list]) => ({
            match: words(list),
            name: `${scope}.genocode`,
          })),
          {
            match: `(${words(functions)})\\s*(?=\\()`,
            captures: { 1: { name: "support.function.builtin.genocode" } },
          },
          {
            match: `(${NAME})\\s*(?=\\()`,
            captures: { 1: { name: "entity.name.function.call.genocode" } },
          },
          { match: words(colours), name: "support.constant.colour.genocode" },
          { match: words(words_), name: "support.constant.genocode" },
          { match: words(others), name: "constant.language.genocode" },
          {
            match: "\\b\\d+(?:\\.\\d+)?(?:[eE][+-]?\\d+)?°?",
            name: "constant.numeric.genocode",
          },
          {
            match: "#(?:[0-9a-fA-F]{8}|[0-9a-fA-F]{6})\\b",
            name: "constant.other.color.rgb-value.genocode",
          },
          { match: "\\.\\.", name: "keyword.operator.range.genocode" },
          { match: "==|!=|<=|>=|<|>", name: "keyword.operator.comparison.genocode" },
          { match: "\\+=|-=|\\*=|/=|=", name: "keyword.operator.assignment.genocode" },
          { match: "[-+*/%^]", name: "keyword.operator.arithmetic.genocode" },
          { match: ",", name: "punctuation.separator.comma.genocode" },
          { match: ";", name: "punctuation.terminator.genocode" },
        ],
      },
      strings: {
        name: "string.quoted.double.genocode",
        begin: '"',
        end: '"|$',
        patterns: [{ match: '\\\\["\\\\n]', name: "constant.character.escape.genocode" }],
      },
      members: {
        // `music.bass`, `turtle.heading`, `flat_gaps.x`: the part after a single dot.
        match: `(?<!\\.)(\\.)\\s*(${NAME})`,
        captures: {
          1: { name: "punctuation.accessor.genocode" },
          2: { name: "variable.other.property.genocode" },
        },
      },
    },
  };
}
