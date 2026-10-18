/** @typedef {import("./types.js").Benchmark} Benchmark */

export const GRADE_LABELS = Object.freeze("A+ A A- B+ B B- C+ C C- D+ D D- F W".split(" "));
const W = 13;

/** @param {number | null | undefined} gpa CSS class for the GPA's color band. */
export function gpaClass(gpa) {
  if (gpa == null) return "g-na";
  if (gpa >= 3.5) return "g-hi";
  if (gpa >= 3.0) return "g-mid";
  if (gpa >= 2.5) return "g-lo";
  return "g-vlo";
}

/** @param {number | null | undefined} gpa */
export function formatGpa(gpa) {
  return gpa == null ? "n/a" : gpa.toFixed(2);
}

/** @type {ReadonlyArray<[number, string]>} */
const LETTER_FLOORS = [
  [3.85, "A"],
  [3.5, "A-"],
  [3.15, "B+"],
  [2.85, "B"],
  [2.5, "B-"],
  [2.15, "C+"],
  [1.85, "C"],
  [1.5, "C-"],
  [1.15, "D+"],
  [0.85, "D"],
];

/** @param {number | null | undefined} gpa */
export function letterGrade(gpa) {
  if (gpa == null) return "";
  return LETTER_FLOORS.find(([floor]) => gpa >= floor)?.[1] ?? "D-/F";
}

/** @type {Readonly<Record<string, string>>} */
const SEASONS = { FA: "Fall", SP: "Spring", SU: "Summer", S1: "Summer I", S2: "Summer II" };

/** @param {string} code Registrar term code such as "FA25". */
export function termLabel(code) {
  const match = /^(FA|SP|SU|S1|S2)(\d{2})$/.exec(code);
  return match ? `${SEASONS[match[1]]} 20${match[2]}` : code || "n/a";
}

const MINOR_WORDS = new Set(["of", "and", "in", "the", "to", "for", "on", "a", "an", "or", "with"]);
const NUMERALS = new Set(["i", "ii", "iii", "iv", "vi"]);

/** @param {string} text */
export function titleCase(text) {
  return text.toLowerCase().replace(/[a-z][a-z']*/g, (word, offset) => {
    if (NUMERALS.has(word)) return word.toUpperCase();
    if (offset > 0 && MINOR_WORDS.has(word)) return word;
    return word[0].toUpperCase() + word.slice(1);
  });
}

/** @param {Benchmark} stats */
export function summarize({ c }) {
  const graded = c.slice(0, W).reduce((sum, n) => sum + n, 0);
  const total = graded + c[W];
  return {
    aPct: graded ? (100 * (c[0] + c[1] + c[2])) / graded : 0,
    wPct: total ? (100 * c[W]) / total : 0,
  };
}
