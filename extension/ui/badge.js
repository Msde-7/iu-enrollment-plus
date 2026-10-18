import { formatGpa } from "../lib/format.js";
import { h } from "./dom.js";

/** @typedef {import("../lib/types.js").Settings} Settings */

/**
 * The badge's label, per the user's metric and comparison settings.
 * @param {Pick<Settings, "metric" | "delta">} settings
 * @param {{ gpa: number | null, aPct: number, diff: number | null }} values `diff` is GPA minus the department's.
 */
export function badgeLabel({ metric, delta }, { gpa, aPct, diff }) {
  /** @type {[string, string][]} */
  const parts = [];
  if (metric !== "a") parts.push([formatGpa(gpa), "GPA"]);
  if (metric !== "gpa") parts.push([`${Math.round(aPct)}%`, "A"]);
  return [
    ...parts.flatMap(([value, label], i) => [
      i > 0 && h("span", { className: "sep" }, "·"),
      value,
      h("span", { className: "lbl" }, label),
    ]),
    delta &&
      diff != null &&
      Math.abs(diff) >= 0.05 &&
      h("span", { className: "lbl" }, `${diff > 0 ? "▲" : "▼"}${Math.abs(diff).toFixed(1)}`),
  ];
}
