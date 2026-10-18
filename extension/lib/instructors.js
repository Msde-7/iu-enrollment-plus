/** @typedef {import("./types.js").Stats} Stats */

const SUFFIX = /\s+(jr|sr|ii|iii|iv)\.?$/i;

/** "Berry Jr,Stafford C" -> { first: "Stafford", last: "Berry" } @param {string} name */
export function splitRegistrarName(name) {
  const [last = "", first = ""] = name.split(",");
  return { last: last.replace(SUFFIX, "").trim(), first: first.trim().split(/\s+/)[0] ?? "" };
}

/** "Ala Avoyan" -> "Avoyan,Ala" @param {string} display */
export function toRegistrarName(display) {
  const parts = display.trim().split(/\s+/);
  return `${parts.at(-1)},${parts[0]}`;
}

/**
 * Finds the registrar entry for a name as Stellic displays it ("First Last").
 * @param {Record<string, Stats>} instructors
 * @param {string} display
 * @returns {[string, Stats] | null}
 */
export function matchInstructor(instructors, display) {
  const parts = display.trim().toLowerCase().split(/\s+/);
  if (parts.length < 2) return null;
  const first = parts[0];
  const last = parts[parts.length - 1];

  const byLast = Object.entries(instructors).filter(([name]) => {
    const surname = splitRegistrarName(name).last.toLowerCase();
    return surname === last || surname.split(/[\s-]/).includes(last);
  });
  const byFirst = byLast.filter(([name]) => splitRegistrarName(name).first.toLowerCase().startsWith(first[0]));
  const candidates = byFirst.length ? byFirst : byLast.length === 1 ? byLast : [];
  return candidates.sort(([, a], [, b]) => b.s - a.s)[0] ?? null;
}

/**
 * @typedef {object} Teacher
 * @property {number} legacyId
 * @property {string} firstName
 * @property {string} lastName
 * @property {string} department
 * @property {number} avgRating
 * @property {number} avgDifficulty
 * @property {number} numRatings
 * @property {number} wouldTakeAgainPercent
 */

/**
 * Picks the RateMyProfessors profile for a registrar name, preferring the one with the most ratings.
 * @param {Teacher[]} teachers
 * @param {{ first: string, last: string }} name
 */
export function pickTeacher(teachers, { first, last }) {
  const lastLc = last.toLowerCase();
  const firstLc = first.toLowerCase();
  return (
    teachers
      .filter((t) => t.lastName.toLowerCase().endsWith(lastLc))
      .filter((t) => {
        const other = t.firstName.toLowerCase();
        return !firstLc || other.startsWith(firstLc.slice(0, 3)) || firstLc.startsWith(other.slice(0, 3));
      })
      .sort((a, b) => b.numRatings - a.numRatings)[0] ?? null
  );
}
