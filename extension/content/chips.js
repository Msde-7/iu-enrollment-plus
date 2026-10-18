import { codesIn } from "../lib/courses.js";
import { formatGpa, gpaClass } from "../lib/format.js";
import { matchInstructor, toRegistrarName } from "../lib/instructors.js";
import { renderRating } from "../ui/card.js";
import { h } from "../ui/dom.js";
import { hostsIn } from "./hosts.js";

/**
 * @typedef {import("../lib/types.js").Course} Course
 * @typedef {import("../lib/types.js").Settings} Settings
 * @typedef {import("./hosts.js").MountHost} MountHost
 * @typedef {import("./badges.js").ResolveCourses} ResolveCourses
 */

const PERSON_NAME = /^[A-Za-z'.-]+(\s+[A-Za-z'.-]+)+$/;
const SEMESTERS_CAPTION = /^\s*\d+\s+semesters?\s*$/i;

/**
 * Instructor names in Stellic's course panel ("Instructors" list, where each name has an
 * "N semesters" caption) and in each section row of the section picker.
 * @param {ParentNode} root
 * @returns {{ el: Element, stacked: boolean }[]}
 */
function findNameElements(root) {
  const found = [];
  for (const caption of root.querySelectorAll("div, span, p")) {
    if (caption.children.length > 1 || !SEMESTERS_CAPTION.test(caption.textContent ?? "")) continue;
    const box = caption.closest(".tw-inline-block") ?? caption.parentElement?.parentElement;
    const name = box && Array.from(box.children).find((c) => !c.contains(caption) && c.textContent?.trim());
    if (name) found.push({ el: name, stacked: false });
  }
  for (const column of root.querySelectorAll(".section-instructors")) {
    const names = Array.from(column.querySelectorAll("p, span, div")).filter(
      (e) => !e.children.length && e.textContent?.trim(),
    );
    for (const el of names.length ? names : [column]) found.push({ el, stacked: true });
  }
  return found;
}

/**
 * @param {{ mountHost: MountHost, resolve: ResolveCourses, getSettings: () => Settings }} deps
 */
export function createChipper({ mountHost, resolve, getSettings }) {
  /** @param {Course | null} course @param {string} display @param {boolean} stacked */
  function chip(course, display, stacked) {
    const { host, root } = mountHost("chip", { name: display, course: course?.key ?? "" });
    if (stacked) host.style.cssText += "display: block; margin-top: 3px;";
    const match = course && matchInstructor(course.i, display);
    const rating = getSettings().rmp ? h("span") : null;
    if (rating) void renderRating(rating, match?.[0] ?? toRegistrarName(display));

    root.append(
      h(
        "span",
        { className: stacked ? "chip stacked" : "chip" },
        match &&
          h(
            "span",
            {
              className: `tc ${gpaClass(match[1].gpa)}`,
              title: `${match[0]} in ${course.key} · ${match[1].s} sections · ${match[1].n} graded students`,
            },
            `${formatGpa(match[1].gpa)} GPA`,
          ),
        course && !match && h("span", { className: "dim" }, "no grade data"),
        rating,
      ),
    );
    return host;
  }

  /** @param {ParentNode} root */
  return async function annotate(root) {
    const targets = findNameElements(root);
    if (!targets.length) return;
    const codeEl = root.querySelector(".course-sub-info, [data-testid='course-code']");
    const [code] = codesIn(codeEl?.textContent ?? "");
    const course = code ? ((await resolve([code])).get(code) ?? null) : null;
    if (!course && !getSettings().rmp) return;

    for (const { el, stacked } of targets) {
      const display = el.textContent?.trim() ?? "";
      const existing = hostsIn(el, "chip")[0];
      if (existing?.dataset.name === display && existing.dataset.course === (course?.key ?? "")) continue;
      existing?.remove();
      if (PERSON_NAME.test(display)) el.append(chip(course, display, stacked));
    }
  };
}
