import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { codesIn, hasCode, lookupCourses, searchCourses } from "../extension/lib/courses.js";

const counts = (a) => [a, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
const stats = { gpa: 4, n: 10, c: counts(10), s: 2, lt: "FA25", lk: 4258 };
const data = {
  levels: { 200: { gpa: 3.3, n: 100, c: counts(100), s: 40 } },
  deptLevels: { "CSCI|200": { gpa: 3.0, n: 50, c: counts(50), s: 20 } },
  courses: {
    "CSCI-C 211": { ...stats, t: "INTRO TO COMPUTER SCIENCE", i: {} },
    "CSCI-C 212": { ...stats, t: "INTRO TO SOFTWARE SYSTEMS", i: {} },
    "MATH-M 211": { ...stats, t: "CALCULUS I", i: {} },
  },
};

describe("course codes", () => {
  it("finds every code in text", () => {
    assert.deepEqual(
      [...codesIn("CSCI-C 211 and MATH-M211, then ECON E201")],
      ["CSCI-C 211", "MATH-M 211", "ECON-E 201"],
    );
  });

  it("ignores text without codes", () => {
    assert.equal(hasCode("Fall 2026 · 3 credits"), false);
    assert.equal(hasCode("CSCI-C 211"), true);
    assert.equal(hasCode("CSCI-C 211"), true, "stateful global regex must reset");
  });

  it("normalizes loose input when looking up", () => {
    assert.deepEqual(Object.keys(lookupCourses(data, ["csci c211"])), ["csci c211"]);
    assert.equal(lookupCourses(data, ["csci c211"])["csci c211"].key, "CSCI-C 211");
  });
});

describe("benchmarks", () => {
  it("attaches department and level averages", () => {
    const { bench } = lookupCourses(data, ["CSCI-C 211"])["CSCI-C 211"];
    assert.equal(bench.dept?.label, "CSCI 200-level");
    assert.equal(bench.dept?.gpa, 3.0);
    assert.equal(bench.level?.label, "All IU 200-level");
  });

  it("returns null when no benchmark exists", () => {
    assert.equal(lookupCourses(data, ["MATH-M 211"])["MATH-M 211"].bench.dept, null);
  });
});

describe("lookupCourses", () => {
  it("keys results by the requested code and skips unknown ones", () => {
    const found = lookupCourses(data, ["CSCI-C 211", "FAKE-X 999"]);
    assert.deepEqual(Object.keys(found), ["CSCI-C 211"]);
  });
});

describe("searchCourses", () => {
  it("returns an exact code match alone", () => {
    assert.deepEqual(
      searchCourses(data, "csci-c 211").map((c) => c.key),
      ["CSCI-C 211"],
    );
  });

  it("matches code prefixes and titles", () => {
    assert.deepEqual(
      searchCourses(data, "CSCI").map((c) => c.key),
      ["CSCI-C 211", "CSCI-C 212"],
    );
    assert.deepEqual(
      searchCourses(data, "calculus").map((c) => c.key),
      ["MATH-M 211"],
    );
  });

  it("respects the limit and ignores blank queries", () => {
    assert.equal(searchCourses(data, "C", 1).length, 1);
    assert.deepEqual(searchCourses(data, "  "), []);
  });
});
