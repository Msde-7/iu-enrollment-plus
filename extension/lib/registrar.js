import { createGradeBuilder } from "./grades.js";

/** @typedef {{ code: string, label: string }} Term */

export const REGISTRAR = "https://gradedistribution.registrar.indiana.edu";
export const SIGN_IN_URL = `${REGISTRAR}/distribution/index.php`;
export const GRADES_KEY = "grades";
const FIRST_YEAR = 2016;
const TERM_OPTION = /<option[^>]*value="(\d+)"[^>]*>\s*([^<]*?\s(\d{4}))\s*<\/option>/g;

/** @param {string} url Resolves to null when the IU login has expired, since the registrar then redirects to it. */
async function get(url) {
  const response = await fetch(url, { credentials: "include", redirect: "manual" });
  if (response.type === "opaqueredirect") return null;
  if (!response.ok) throw new Error(`The registrar responded ${response.status}`);
  return response.text();
}

/** @param {string} html @returns {Term[]} Oldest first. */
export function termsIn(html) {
  return [...html.matchAll(TERM_OPTION)]
    .filter(([, , , year]) => Number(year) >= FIRST_YEAR)
    .map(([, code, label]) => ({ code, label }))
    .sort((a, b) => Number(a.code) - Number(b.code));
}

/**
 * Downloads every term since 2016 with the student's own IU login and stores the combined grade data.
 * @param {(term: Term, done: number, total: number) => void} onTerm
 * @returns {Promise<boolean>} False when the student needs to sign in first.
 */
export async function syncGrades(onTerm) {
  const page = await get(SIGN_IN_URL);
  if (page == null) return false;
  const terms = termsIn(page);
  if (!terms.length) throw new Error("No terms found on the registrar's site");

  const builder = createGradeBuilder();
  for (const [done, term] of terms.entries()) {
    onTerm(term, done, terms.length);
    const csv = await get(`${REGISTRAR}/distribution/export.php?term=${term.code}&c=desc&go=i&r=gradedist`);
    if (csv == null) return false;
    builder.add(csv);
  }
  await chrome.storage.local.set({ [GRADES_KEY]: { ...builder.build(), syncedAt: Date.now() } });
  return true;
}
