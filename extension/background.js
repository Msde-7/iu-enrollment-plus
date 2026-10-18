import { lookupCourses, searchCourses } from "./lib/courses.js";
import { pickTeacher, splitRegistrarName } from "./lib/instructors.js";

/**
 * @typedef {import("./lib/types.js").GradeData} GradeData
 * @typedef {import("./lib/types.js").Rating} Rating
 * @typedef {import("./lib/types.js").Request} Request
 * @typedef {import("./lib/instructors.js").Teacher} Teacher
 */

const RMP_ENDPOINT = "https://www.ratemyprofessors.com/graphql";
const RMP_AUTH = "Basic dGVzdDp0ZXN0";
const RMP_SCHOOL_ID = "U2Nob29sLTQ0MA==";
const RATING_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const TEACHER_QUERY = `query ($text: String!, $school: ID!) {
  newSearch { teachers(query: { text: $text, schoolID: $school }, first: 10) {
    edges { node { legacyId firstName lastName department avgRating avgDifficulty numRatings wouldTakeAgainPercent } }
  } }
}`;

/** @type {Promise<GradeData> | undefined} */
let gradeData;
const loadGrades = () => (gradeData ??= fetch(chrome.runtime.getURL("data/grades.json")).then((r) => r.json()));

/** @param {string} text @returns {Promise<Teacher[]>} */
async function searchTeachers(text) {
  const response = await fetch(RMP_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: RMP_AUTH },
    body: JSON.stringify({ query: TEACHER_QUERY, variables: { text, school: RMP_SCHOOL_ID } }),
  });
  if (!response.ok) throw new Error(`RateMyProfessors responded ${response.status}`);
  const body = await response.json();
  return body.data?.newSearch?.teachers?.edges?.map((/** @type {{ node: Teacher }} */ e) => e.node) ?? [];
}

/** @param {string} instructor Registrar-style "Last,First". @returns {Promise<Rating | null>} */
async function lookupRating(instructor) {
  const cacheKey = `rating:${instructor}`;
  const stored = await chrome.storage.local.get(cacheKey);
  const cached = /** @type {{ at: number, value: Rating | null } | undefined} */ (stored[cacheKey]);
  if (cached && Date.now() - cached.at < RATING_TTL_MS) return cached.value;

  const name = splitRegistrarName(instructor);
  let teachers = await searchTeachers(`${name.first} ${name.last}`.trim());
  if (!teachers.length) teachers = await searchTeachers(name.last);
  const teacher = pickTeacher(teachers, name);
  const value = teacher && {
    id: teacher.legacyId,
    name: `${teacher.firstName} ${teacher.lastName}`,
    dept: teacher.department,
    rating: teacher.avgRating,
    difficulty: teacher.avgDifficulty,
    count: teacher.numRatings,
    again: teacher.wouldTakeAgainPercent,
  };
  await chrome.storage.local.set({ [cacheKey]: { at: Date.now(), value } });
  return value;
}

/** @param {Request} message */
async function handle(message) {
  switch (message.type) {
    case "courses":
      return lookupCourses(await loadGrades(), message.codes);
    case "search":
      return searchCourses(await loadGrades(), message.text);
    case "rating":
      return lookupRating(message.instructor);
  }
}

chrome.runtime.onInstalled.addListener(async () => {
  await chrome.storage.local.clear();
  const [{ matches, js: files } = {}] = chrome.runtime.getManifest().content_scripts ?? [];
  if (!matches || !files) return;
  const tabs = await chrome.tabs.query({ url: matches });
  await Promise.allSettled(
    tabs.flatMap((tab) =>
      tab.id ? [chrome.scripting.executeScript({ target: { tabId: tab.id, allFrames: true }, files })] : [],
    ),
  );
});

chrome.runtime.onMessage.addListener((message, _sender, reply) => {
  handle(message).then(
    (data) => reply({ ok: true, data }),
    (error) => reply({ ok: false, error: String(error) }),
  );
  return true;
});
