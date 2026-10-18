import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { formatGpa, gpaClass, letterGrade, summarize, termLabel, titleCase } from "../extension/lib/format.js";

describe("gpaClass", () => {
  it("buckets by threshold", () => {
    assert.equal(gpaClass(3.5), "g-hi");
    assert.equal(gpaClass(3.49), "g-mid");
    assert.equal(gpaClass(3.0), "g-mid");
    assert.equal(gpaClass(2.5), "g-lo");
    assert.equal(gpaClass(2.49), "g-vlo");
    assert.equal(gpaClass(null), "g-na");
  });
});

describe("formatGpa", () => {
  it("uses two decimals and n/a for missing values", () => {
    assert.equal(formatGpa(3.1), "3.10");
    assert.equal(formatGpa(null), "n/a");
  });
});

describe("letterGrade", () => {
  it("maps GPA to the nearest letter", () => {
    assert.equal(letterGrade(3.9), "A");
    assert.equal(letterGrade(3.62), "A-");
    assert.equal(letterGrade(2.72), "B-");
    assert.equal(letterGrade(0.5), "D-/F");
    assert.equal(letterGrade(null), "");
  });
});

describe("termLabel", () => {
  it("expands registrar term codes", () => {
    assert.equal(termLabel("FA25"), "Fall 2025");
    assert.equal(termLabel("S211"), "Summer II 2011");
    assert.equal(termLabel("XX"), "XX");
    assert.equal(termLabel(""), "n/a");
  });
});

describe("titleCase", () => {
  it("capitalizes words but not minor words or numerals", () => {
    assert.equal(titleCase("INTRO TO COMPUTER SCIENCE"), "Intro to Computer Science");
    assert.equal(titleCase("THE HISTORY OF ROME II"), "The History of Rome II");
  });
});

describe("summarize", () => {
  it("computes A and withdrawal rates", () => {
    const c = [1, 2, 1, 2, 2, 0, 0, 1, 0, 0, 0, 0, 1, 2];
    const { aPct, wPct } = summarize({ gpa: 3, n: 10, s: 1, c });
    assert.equal(aPct, 40);
    assert.equal(Math.round(wPct), 17);
  });

  it("handles empty counts", () => {
    assert.deepEqual(summarize({ gpa: null, n: 0, s: 0, c: Array(14).fill(0) }), { aPct: 0, wPct: 0 });
  });
});
