/**
 * @typedef {import("./types.js").GradeData} GradeData
 * @typedef {import("./types.js").GradeCounts} GradeCounts
 * @typedef {{ c: GradeCounts, s: number, lt: string, lk: number }} Tally
 * @typedef {{ t: string, total: Tally, i: Map<string, Tally> }} CourseTally
 */

export const GRADES = ["A+", "A", "A-", "B+", "B", "B-", "C+", "C", "C-", "D+", "D", "D-", "F", "W"];
const POINTS = [4, 4, 3.7, 3.3, 3, 2.7, 2.3, 2, 1.7, 1.3, 1, 0.7, 0];

/** @param {string} text @returns {string[][]} */
export function parseCsv(text) {
  /** @type {string[][]} */
  const rows = [];
  /** @type {string[]} */
  let row = [];
  let field = "";
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (quoted) {
      if (ch !== '"') field += ch;
      else if (text[i + 1] === '"') field += text[i++];
      else quoted = false;
    } else if (ch === '"') quoted = true;
    else if (ch === ",") {
      row.push(field);
      field = "";
    } else if (ch === "\n") {
      rows.push([...row, field]);
      row = [];
      field = "";
    } else if (ch !== "\r") field += ch;
  }
  if (field || row.length) rows.push([...row, field]);
  return rows;
}

/** @returns {Tally} */
const tally = () => ({ c: GRADES.map(() => 0), s: 0, lt: "", lk: 0 });

/** @param {Tally} into @param {GradeCounts} counts @param {number} sections @param {string} term @param {number} termKey */
function add(into, counts, sections, term = "", termKey = 0) {
  counts.forEach((n, i) => (into.c[i] += n));
  into.s += sections;
  if (termKey > into.lk) Object.assign(into, { lt: term, lk: termKey });
}

/** @param {Tally} t */
function benchmark({ c, s }) {
  const graded = POINTS.reduce((sum, _, i) => sum + c[i], 0);
  const points = POINTS.reduce((sum, p, i) => sum + p * c[i], 0);
  return { gpa: graded ? Number((points / graded).toFixed(2)) : null, n: graded, c, s };
}

/** @param {Tally} t */
const stats = (t) => ({ ...benchmark(t), lt: t.lt, lk: t.lk });

/** Folds registrar CSV exports, one term at a time, into the extension's grade data. */
export function createGradeBuilder() {
  /** @type {Map<string, CourseTally>} */
  const courses = new Map();

  return {
    /** @param {string} csv One term exported from the registrar's grade distribution site. */
    add(csv) {
      const [header = [], ...rows] = parseCsv(csv);
      if (!header.includes("TERM")) throw new Error("Not a grade distribution export");
      const column = new Map(header.map((name, i) => [name, i]));
      for (const row of rows) {
        /** @param {string} name */
        const get = (name) => row[column.get(name) ?? -1] ?? "";
        if (get("SMALL CLASS NOTATION")) continue;
        const counts = GRADES.map((g) => Number(get(g)) || 0);
        counts[counts.length - 1] += Number(get("WX")) || 0;
        const termKey = Number.parseInt(get("TERM"), 10);
        if (!counts.some(Boolean) || !termKey) continue;

        const key = `${get("SUBJECT").trim()} ${get("COURSE").trim()}`;
        const term = get("TERM DESCRIPTION").trim();
        const course = courses.get(key) ?? { t: get("COURSE DESCRIPTION").trim(), total: tally(), i: new Map() };
        courses.set(key, course);
        add(course.total, counts, 1, term, termKey);
        const instructor = get("INSTRUCTOR NAME").trim();
        if (!instructor) continue;
        const own = course.i.get(instructor) ?? tally();
        course.i.set(instructor, own);
        add(own, counts, 1, term, termKey);
      }
    },

    /** @returns {GradeData} */
    build() {
      /** @type {Map<string, Tally>} */
      const levels = new Map();
      /** @type {Map<string, Tally>} */
      const deptLevels = new Map();
      for (const [key, { total }] of courses) {
        const [subject, number] = key.split(" ");
        const level = `${number[0]}00`;
        for (const [table, bucket] of /** @type {const} */ ([
          [levels, level],
          [deptLevels, `${subject.split("-")[0]}|${level}`],
        ])) {
          const into = table.get(bucket) ?? tally();
          table.set(bucket, into);
          add(into, total.c, total.s);
        }
      }
      /** @param {Map<string, Tally>} table */
      const benchmarks = (table) => Object.fromEntries([...table].map(([k, t]) => [k, benchmark(t)]));
      return {
        levels: benchmarks(levels),
        deptLevels: benchmarks(deptLevels),
        courses: Object.fromEntries(
          [...courses].map(([key, { t, total, i }]) => [
            key,
            { t, ...stats(total), i: Object.fromEntries([...i].map(([name, own]) => [name, stats(own)])) },
          ]),
        ),
      };
    },
  };
}
