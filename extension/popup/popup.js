import { formatGpa, gpaClass } from "../lib/format.js";
import { request } from "../lib/messages.js";
import { loadSettings, saveSetting } from "../lib/settings.js";
import { badgeLabel } from "../ui/badge.js";
import { renderCard } from "../ui/card.js";
import { h } from "../ui/dom.js";

/**
 * @typedef {import("../lib/types.js").Course} Course
 * @typedef {import("../lib/types.js").Settings} Settings
 * @typedef {{ key: keyof Settings, label: string, hint?: string, options?: [string, string][] }} Field
 */

/** @type {Field[]} */
const FIELDS = [
  { key: "badges", label: "Course badges", hint: "GPA badge next to every course code in Stellic" },
  {
    key: "metric",
    label: "Badge shows",
    hint: "What the badge displays at a glance",
    options: [
      ["gpa", "Average GPA"],
      ["a", "% who got an A"],
      ["both", "Both"],
    ],
  },
  { key: "delta", label: "Compare to department", hint: "▲/▼ vs. the department's average at that level" },
  {
    key: "openOn",
    label: "Open details on",
    hint: "Click always pins the card open",
    options: [
      ["hover", "Hover"],
      ["click", "Click only"],
    ],
  },
  { key: "chips", label: "Instructor chips", hint: "GPA and rating next to instructors in course panels and sections" },
  { key: "rmp", label: "RateMyProfessors", hint: "Look up instructor ratings (cached for a week)" },
  {
    key: "theme",
    label: "Color theme",
    options: [
      ["color", "Green → red"],
      ["crimson", "IU crimson"],
      ["mono", "Monochrome"],
    ],
  },
  { key: "compact", label: "Compact badges", hint: "Smaller badges without labels" },
];

const IDLE_HINT = "Badges appear next to every course in Stellic. Hover one to preview, click to pin.";
const SEARCH_DELAY_MS = 150;
const SAVED_FLASH_MS = 1400;

/** @param {string} id */
function byId(id) {
  const el = document.getElementById(id);
  if (!el) throw new Error(`Missing #${id}`);
  return el;
}

const query = /** @type {HTMLInputElement} */ (byId("query"));
const results = byId("results");
const hint = byId("hint");
let settings = await loadSettings();

/** @param {Node} node */
const themed = (node) => h("div", { className: `root theme-${settings.theme}` }, node);

/** @param {Course} course */
function showCourse(course) {
  hint.hidden = true;
  results.replaceChildren(themed(renderCard(course, settings)));
}

let searchId = 0;
async function search() {
  const id = ++searchId;
  const text = query.value.trim();
  const hits = text ? ((await request({ type: "search", text })) ?? []) : [];
  if (id !== searchId) return;

  hint.hidden = hits.length > 0;
  hint.textContent = text ? "No matching courses since 2016." : IDLE_HINT;
  if (hits.length === 1) return showCourse(hits[0]);
  results.replaceChildren(
    ...hits.map((course) =>
      themed(
        h(
          "button",
          { className: "row", on: { click: () => showCourse(course) } },
          h("b", null, course.key),
          h("span", { className: "t" }, course.t),
          h("span", { className: `pill ${gpaClass(course.gpa)}` }, formatGpa(course.gpa)),
        ),
      ),
    ),
  );
}

function renderPreview() {
  const badge = h("span", { className: "badge g-hi" }, ...badgeLabel(settings, { gpa: 3.62, aPct: 58, diff: 0.3 }));
  byId("preview-badge").replaceChildren(
    h(
      "span",
      { className: `root theme-${settings.theme}${settings.compact ? " compact" : ""}` },
      settings.badges ? badge : h("span", { className: "dim" }, "badges off"),
    ),
  );
}

let savedTimer = 0;
/** @template {keyof Settings} K @param {K} key @param {Settings[K]} value */
async function update(key, value) {
  settings = { ...settings, [key]: value };
  renderPreview();
  await saveSetting(key, value);
  const saved = byId("saved");
  saved.classList.add("on");
  clearTimeout(savedTimer);
  savedTimer = setTimeout(() => saved.classList.remove("on"), SAVED_FLASH_MS);
}

/** @param {Field} field */
function renderField({ key, label, hint: description, options }) {
  const id = `field-${key}`;
  const control = options
    ? h(
        "select",
        {
          attrs: { id },
          on: {
            change: (e) => {
              const { value } = /** @type {HTMLSelectElement} */ (e.target);
              void update(key, /** @type {Settings[typeof key]} */ (/** @type {unknown} */ (value)));
            },
          },
        },
        ...options.map(([value, text]) => {
          const option = h("option", { attrs: { value } }, text);
          option.selected = settings[key] === value;
          return option;
        }),
      )
    : h("input", {
        className: "switch",
        attrs: { id, type: "checkbox", ...(settings[key] ? { checked: "" } : {}) },
        on: { change: (e) => void update(key, /** @type {HTMLInputElement} */ (e.target).checked) },
      });
  return h(
    "div",
    { className: "set" },
    h("label", { attrs: { for: id } }, label, description && h("small", null, description)),
    control,
  );
}

for (const tab of document.querySelectorAll("[role=tab]")) {
  tab.addEventListener("click", () => {
    for (const other of document.querySelectorAll("[role=tab]")) {
      const selected = other === tab;
      other.setAttribute("aria-selected", String(selected));
      byId(other.getAttribute("aria-controls") ?? "").hidden = !selected;
    }
    if (tab.getAttribute("aria-controls") === "search") query.focus();
  });
}

let searchTimer = 0;
query.addEventListener("input", () => {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(search, SEARCH_DELAY_MS);
});
byId("search-form").addEventListener("submit", (e) => {
  e.preventDefault();
  void search();
});

hint.textContent = IDLE_HINT;
if (!(await request({ type: "status" }))) {
  hint.replaceChildren(
    "Grade data isn't loaded yet. ",
    h("a", { attrs: { href: "../welcome/welcome.html", target: "_blank" } }, "Load it with your IU login"),
  );
}
byId("fields").replaceChildren(...FIELDS.map(renderField));
renderPreview();
