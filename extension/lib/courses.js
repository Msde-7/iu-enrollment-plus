/**
 * @typedef {import("./types.js").GradeData} GradeData
 * @typedef {import("./types.js").CourseRecord} CourseRecord
 * @typedef {import("./types.js").Course} Course
 */

const CODE_PATTERN = /\b([A-Z]{2,5})[ -]?([A-Z])[ -]?(\d{3})\b/g;
const LOOSE_CODE = /([A-Z]{2,5})[\s-]*([A-Z])[\s-]*(\d{3})/;

/** @param {string} text @returns {Set<string>} Normalized codes like "CSCI-C 211". */
export function codesIn(text) {
  return new Set(Array.from(text.matchAll(CODE_PATTERN), ([, dept, letter, num]) => `${dept}-${letter} ${num}`));
}

/** @param {string} text */
export function hasCode(text) {
  CODE_PATTERN.lastIndex = 0;
  return CODE_PATTERN.test(text);
}

/** @param {string} text */
function normalizeCode(text) {
  const match = LOOSE_CODE.exec(text.toUpperCase());
  return match ? `${match[1]}-${match[2]} ${match[3]}` : null;
}

/** @param {GradeData} data @param {string} key @param {CourseRecord} record @returns {Course} */
function withBenchmarks(data, key, record) {
  const [subject, number] = key.split(" ");
  const dept = subject.split("-")[0];
  const level = `${number[0]}00`;
  const deptBench = data.deptLevels[`${dept}|${level}`];
  const levelBench = data.levels[level];
  return {
    key,
    ...record,
    bench: {
      dept: deptBench ? { label: `${dept} ${level}-level`, ...deptBench } : null,
      level: levelBench ? { label: `All IU ${level}-level`, ...levelBench } : null,
    },
  };
}

/** @param {GradeData} data @param {string[]} codes @returns {Record<string, Course>} */
export function lookupCourses(data, codes) {
  /** @type {Record<string, Course>} */
  const found = {};
  for (const code of codes) {
    const key = normalizeCode(code);
    const record = key ? data.courses[key] : undefined;
    if (key && record) found[code] = withBenchmarks(data, key, record);
  }
  return found;
}

/** @param {GradeData} data @param {string} text @returns {Course[]} */
export function searchCourses(data, text, limit = 25) {
  const query = text.trim().toUpperCase();
  if (!query) return [];
  const exact = normalizeCode(query);
  if (exact && data.courses[exact]) return [withBenchmarks(data, exact, data.courses[exact])];

  const compact = query.replace(/[\s-]/g, "");
  /** @type {Course[]} */
  const hits = [];
  for (const [key, record] of Object.entries(data.courses)) {
    if (key.replace(/[\s-]/g, "").includes(compact) || record.t.includes(query)) {
      hits.push(withBenchmarks(data, key, record));
      if (hits.length === limit) break;
    }
  }
  return hits;
}
