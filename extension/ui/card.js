import { GRADE_LABELS, formatGpa, gpaClass, letterGrade, summarize, termLabel, titleCase } from "../lib/format.js";
import { request } from "../lib/messages.js";
import { syllabusUrl } from "../lib/syllabi.js";
import { h } from "./dom.js";

/**
 * @typedef {import("../lib/types.js").Course} Course
 * @typedef {import("../lib/types.js").LabeledBenchmark} LabeledBenchmark
 * @typedef {import("../lib/types.js").Settings} Settings
 * @typedef {import("../lib/types.js").Stats} Stats
 */

const BAR_CLASS = ["a", "a", "a", "b", "b", "b", "c", "c", "c", "d", "d", "d", "f", "w"];
const INSTRUCTOR_LIMIT = 6;

/** @param {number} n */
const pct = (n) => `${n.toFixed(0)}%`;

/**
 * Fills `target` with an instructor's RateMyProfessors rating.
 * @param {HTMLElement} target
 * @param {string} instructor Registrar-style "Last,First".
 */
export async function renderRating(target, instructor, { withCount = true } = {}) {
  target.dataset.rating = "-1";
  target.replaceChildren(h("span", { className: "dim" }, "…"));
  const rating = await request({ type: "rating", instructor });
  target.dataset.rating = String(rating?.count ? rating.rating : -1);

  if (!rating?.count) {
    target.title = rating ? "On RateMyProfessors, no ratings yet" : "Not found on RateMyProfessors";
    target.replaceChildren(h("span", { className: "dim" }, "★ n/a"));
    return;
  }
  const again = rating.again >= 0 ? `\n${Math.round(rating.again)}% would take again` : "";
  target.replaceChildren(
    h(
      "a",
      {
        className: "rmp",
        title: `${rating.name} · ${rating.dept}\nQuality ${rating.rating}/5 · Difficulty ${rating.difficulty}/5 · ${rating.count} ratings${again}`,
        attrs: { href: `https://www.ratemyprofessors.com/professor/${rating.id}`, target: "_blank", rel: "noopener" },
        on: { click: (e) => e.stopPropagation() },
      },
      h("span", { className: "star" }, "★"),
      ` ${rating.rating.toFixed(1)}`,
      withCount && h("span", { className: "dim" }, ` (${rating.count})`),
    ),
  );
}

/** @param {string} code @param {Pick<Stats, "lt" | "lk">} term @param {string} className @param {string} text */
function syllabusLink(code, { lt, lk }, className, text) {
  const href = syllabusUrl(code, lk);
  if (!href) return h("span", { className }, termLabel(lt));
  return h(
    "a",
    {
      className,
      title: `Open IU syllabi for ${code} in ${termLabel(lt)}`,
      attrs: { href, target: "_blank", rel: "noopener" },
      on: { click: (e) => e.stopPropagation() },
    },
    text,
  );
}

/** @param {Course} course */
function renderSummary(course) {
  const { aPct, wPct } = summarize(course);
  /** @param {string} value @param {string} label */
  const fact = (value, label) => h("div", { className: "fact" }, h("b", null, value), label);
  return h(
    "div",
    { className: "hero" },
    h(
      "div",
      { className: `gpa ${gpaClass(course.gpa)}` },
      h("b", null, formatGpa(course.gpa)),
      h("span", null, `avg GPA · ${letterGrade(course.gpa)}`),
    ),
    h(
      "div",
      { className: "facts" },
      fact(pct(aPct), "got an A"),
      fact(pct(wPct), "withdrew"),
      fact(course.n.toLocaleString(), `students · ${course.s} sections`),
      fact(termLabel(course.lt), "last offered"),
    ),
  );
}

/** @param {number[]} counts */
function renderHistogram(counts) {
  const max = Math.max(...counts, 1);
  const total = counts.reduce((sum, n) => sum + n, 0) || 1;
  return h(
    "div",
    { className: "hist" },
    h(
      "div",
      { className: "cols" },
      ...counts.map((n, i) =>
        h(
          "div",
          { className: `col b-${BAR_CLASS[i]}`, style: { height: `${(100 * n) / max}%` } },
          h(
            "span",
            { className: "tip" },
            `${GRADE_LABELS[i]} ${((100 * n) / total).toFixed(1)}% · ${n.toLocaleString()}`,
          ),
        ),
      ),
    ),
    h("div", { className: "col-labels" }, ...GRADE_LABELS.map((label) => h("span", null, label))),
  );
}

/** @param {number} gpa Position on a 2.0 to 4.0 track. */
const trackPosition = (gpa) => `${Math.min(100, Math.max(0, ((gpa - 2) / 2) * 100))}%`;

/** @param {Course} course @param {LabeledBenchmark} bench */
function renderComparison(course, bench) {
  if (bench.gpa == null) return null;
  const diff = course.gpa == null ? null : course.gpa - bench.gpa;
  const direction = diff == null ? "" : diff >= 0.05 ? "up" : diff <= -0.05 ? "down" : "even";
  const verdict =
    diff == null
      ? ""
      : direction === "even"
        ? "about the same"
        : `${diff > 0 ? "▲" : "▼"} ${Math.abs(diff).toFixed(2)} ${diff > 0 ? "higher" : "lower"}`;

  return h(
    "div",
    { className: "cmp-row" },
    h(
      "div",
      { className: "cmp-l" },
      h("b", null, bench.label),
      h("span", { className: "dim" }, `${bench.s.toLocaleString()} sections · ${pct(summarize(bench).aPct)} A`),
    ),
    h(
      "div",
      { className: "track" },
      h("i", {
        className: "mk them",
        title: `${bench.label} average ${formatGpa(bench.gpa)}`,
        style: { left: trackPosition(bench.gpa) },
      }),
      course.gpa != null &&
        h("i", {
          className: `mk me ${gpaClass(course.gpa)}`,
          title: `${course.key} average ${formatGpa(course.gpa)}`,
          style: { left: trackPosition(course.gpa) },
        }),
    ),
    h("div", { className: `delta ${direction}` }, h("b", null, formatGpa(bench.gpa)), h("span", null, verdict)),
  );
}

/** @param {Course} course */
function renderComparisons(course) {
  const rows = [course.bench.dept, course.bench.level].flatMap((b) => (b ? [renderComparison(course, b)] : []));
  return h(
    "div",
    { className: "cmp" },
    h(
      "div",
      { className: "sec-h" },
      h("h4", null, "How it compares"),
      h("small", null, "average GPA on a 2.0 to 4.0 scale"),
    ),
    ...rows,
    h(
      "div",
      { className: "cmp-key" },
      h("i", { className: "mk-k me" }),
      "this course",
      h("i", { className: "mk-k them" }),
      "average",
    ),
  );
}

/**
 * @typedef {object} Row
 * @property {string} name
 * @property {Stats} stats
 * @property {number} aPct
 * @property {HTMLTableRowElement} tr
 * @property {HTMLTableCellElement | null} ratingCell
 */

/** @param {Course} course @param {Settings} settings */
function renderInstructors(course, settings) {
  /** @type {Row[]} */
  const rows = Object.entries(course.i).map(([name, stats]) => {
    const ratingCell = settings.rmp ? h("td") : null;
    const tr = h(
      "tr",
      null,
      h("td", { className: "n" }, name.replace(",", ", ")),
      h("td", null, h("span", { className: `pill ${gpaClass(stats.gpa)}` }, formatGpa(stats.gpa))),
      h("td", null, pct(summarize(stats).aPct)),
      h("td", null, stats.s),
      h("td", null, syllabusLink(course.key, stats, "term", termLabel(stats.lt))),
      ratingCell,
    );
    return { name, stats, aPct: summarize(stats).aPct, tr, ratingCell };
  });
  if (!rows.length) return null;

  /** @type {{ key: string, label: string, value: (r: Row) => number | string, ascending?: boolean }[]} */
  const columns = [
    { key: "name", label: "Name", value: (r) => r.name, ascending: true },
    { key: "gpa", label: "GPA", value: (r) => r.stats.gpa ?? -1 },
    { key: "a", label: "A %", value: (r) => r.aPct },
    { key: "sections", label: "Sections", value: (r) => r.stats.s },
    { key: "last", label: "Last", value: (r) => r.stats.lk },
  ];
  if (settings.rmp) {
    columns.push({ key: "rmp", label: "RMP", value: (r) => Number(r.ratingCell?.dataset.rating ?? -1) });
  }

  let sort = { key: "sections", ascending: false };
  let expanded = false;
  const head = h("tr");
  const body = h("tbody");
  const toggle = h("button", { className: "more", on: { click: () => ((expanded = !expanded), render()) } });

  function render() {
    head.replaceChildren(
      ...columns.map((column) =>
        h(
          "th",
          {
            className: column.key === sort.key ? `on${sort.ascending ? " asc" : ""}` : "",
            on: {
              click: () => {
                sort = {
                  key: column.key,
                  ascending: column.key === sort.key ? !sort.ascending : Boolean(column.ascending),
                };
                render();
              },
            },
          },
          column.label,
        ),
      ),
    );
    const column = columns.find((c) => c.key === sort.key) ?? columns[0];
    const sorted = rows.toSorted((a, b) => {
      const x = column.value(a);
      const y = column.value(b);
      const order = typeof x === "string" && typeof y === "string" ? x.localeCompare(y) : Number(x) - Number(y);
      return sort.ascending ? order : -order;
    });
    const shown = expanded ? sorted : sorted.slice(0, INSTRUCTOR_LIMIT);
    for (const row of shown) {
      if (row.ratingCell && !row.ratingCell.dataset.rating) {
        void renderRating(row.ratingCell, row.name, { withCount: false });
      }
    }
    body.replaceChildren(...shown.map((r) => r.tr));
    toggle.hidden = rows.length <= INSTRUCTOR_LIMIT;
    toggle.textContent = expanded ? "Show fewer" : `Show all ${rows.length} instructors`;
  }
  render();

  return h(
    "div",
    null,
    h(
      "div",
      { className: "sec-h" },
      h("h4", null, "Instructors"),
      h("small", null, `${rows.length} since 2016 · click a column to sort`),
    ),
    h("table", null, h("thead", null, head), body),
    toggle,
  );
}

/** @param {Course} course @param {Settings} settings */
export function renderCard(course, settings) {
  return h(
    "div",
    { className: "card" },
    h("div", { className: "code" }, course.key),
    h("div", { className: "title" }, titleCase(course.t)),
    syllabusUrl(course.key, course.lk) &&
      syllabusLink(course.key, course, "syllabi", `Syllabi from ${termLabel(course.lt)} ↗`),
    renderSummary(course),
    renderHistogram(course.c),
    renderComparisons(course),
    renderInstructors(course, settings),
    h(
      "div",
      { className: "foot" },
      h(
        "a",
        { attrs: { href: "https://gradedistribution.registrar.indiana.edu/", target: "_blank", rel: "noopener" } },
        "IU Registrar grade distribution",
      ),
      h("span", null, "2016 to 2026 · small sections withheld by IU"),
    ),
  );
}
