import { codesIn, hasCode } from "../lib/courses.js";
import { formatGpa, gpaClass, summarize } from "../lib/format.js";
import { badgeLabel } from "../ui/badge.js";
import { h } from "../ui/dom.js";
import { hostsIn } from "./hosts.js";

/**
 * @typedef {import("../lib/types.js").Course} Course
 * @typedef {import("../lib/types.js").Settings} Settings
 * @typedef {import("./hosts.js").MountHost} MountHost
 * @typedef {ReturnType<typeof import("./popover.js").createPopover>} Popover
 * @typedef {(codes: Iterable<string>) => Promise<Map<string, Course | null>>} ResolveCourses
 */

const SKIP_TAGS = new Set("TITLE HEAD SCRIPT STYLE NOSCRIPT CODE TEXTAREA INPUT SELECT OPTION".split(" "));

/** @param {Node} root @returns {Text[]} */
function textNodesWithCodes(root) {
  /** @type {Text[]} */
  const nodes = [];
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      const parent = node.parentElement;
      if (!parent || SKIP_TAGS.has(parent.tagName) || parent.isContentEditable) return NodeFilter.FILTER_REJECT;
      return hasCode(node.nodeValue ?? "") ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
    },
  });
  for (let n = walker.nextNode(); n; n = walker.nextNode()) if (n instanceof Text) nodes.push(n);
  return nodes;
}

/**
 * @param {{ mountHost: MountHost, popover: Popover, resolve: ResolveCourses, getSettings: () => Settings }} deps
 */
export function createBadger({ mountHost, popover, resolve, getSettings }) {
  /** @param {Course} course */
  function badge(course) {
    const { host, root } = mountHost("badge", { code: course.key });
    const dept = course.bench.dept;
    const diff = dept?.gpa != null && course.gpa != null ? course.gpa - dept.gpa : null;
    const button = h(
      "button",
      {
        className: `badge ${gpaClass(course.gpa)}`,
        title:
          dept?.gpa != null
            ? `${course.key} avg GPA ${formatGpa(course.gpa)} · ${dept.label} avg ${formatGpa(dept.gpa)}`
            : course.key,
        attrs: { type: "button", "aria-label": `${course.key} grade distribution` },
        on: {
          mousedown: (e) => e.stopPropagation(),
          click: (e) => {
            e.preventDefault();
            e.stopPropagation();
            popover.toggle(button, course);
          },
          mouseenter: () => getSettings().openOn === "hover" && popover.hover(button, course),
          mouseleave: () => popover.leave(),
        },
      },
      ...badgeLabel(getSettings(), { gpa: course.gpa, aPct: summarize(course).aPct, diff }),
    );
    root.append(button);
    return host;
  }

  /** @param {string} code */
  function emptyBadge(code) {
    const { host, root } = mountHost("badge", { code });
    root.append(
      h(
        "span",
        {
          className: "badge empty g-na",
          title: `No public grade data for ${code} since 2016. IU withholds small sections, and new courses have none yet.`,
        },
        "no grades",
      ),
    );
    return host;
  }

  /** Stellic re-renders lists in place, so drop badges whose code no longer sits beside them. @param {ParentNode} root */
  function removeStale(root) {
    for (const host of hostsIn(root, "badge")) {
      if (!host.parentElement || !codesIn(host.parentElement.textContent ?? "").has(host.dataset.code ?? "")) {
        host.remove();
      }
    }
  }

  /** @param {ParentNode & Node} root */
  return async function annotate(root) {
    removeStale(root);
    const nodes = textNodesWithCodes(root instanceof Document ? root.body : root);
    if (!nodes.length) return;
    const courses = await resolve(nodes.flatMap((n) => [...codesIn(n.nodeValue ?? "")]));

    for (const node of nodes) {
      const parent = node.parentElement;
      if (!parent || !node.isConnected) continue;
      const present = new Set(
        hostsIn(parent, "badge")
          .filter((b) => b.parentElement === parent)
          .map((b) => b.dataset.code),
      );
      for (const code of codesIn(node.nodeValue ?? "")) {
        if (present.has(code) || !courses.has(code)) continue;
        present.add(code);
        const course = courses.get(code);
        node.after(course ? badge(course) : emptyBadge(code));
      }
    }
  };
}
