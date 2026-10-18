import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { matchInstructor, pickTeacher, splitRegistrarName, toRegistrarName } from "../extension/lib/instructors.js";

const stats = (s) => ({ gpa: 3, n: 10, c: [], s, lt: "", lk: 0 });

describe("registrar names", () => {
  it("splits and strips suffixes", () => {
    assert.deepEqual(splitRegistrarName("Berry Jr,Stafford C"), { last: "Berry", first: "Stafford" });
    assert.deepEqual(splitRegistrarName("Shan,Chung-chieh"), { last: "Shan", first: "Chung-chieh" });
  });

  it("converts display names", () => {
    assert.equal(toRegistrarName("Ala Avoyan"), "Avoyan,Ala");
  });
});

describe("matchInstructor", () => {
  const instructors = {
    "Avoyan,Ala": stats(3),
    "Tobin-Hochstadt,Sam": stats(7),
    "Smith,John": stats(1),
    "Smith,Jane": stats(5),
  };

  it("matches first and last name", () => {
    assert.equal(matchInstructor(instructors, "Ala Avoyan")?.[0], "Avoyan,Ala");
    assert.equal(matchInstructor(instructors, "Jane Smith")?.[0], "Smith,Jane");
  });

  it("matches hyphenated surnames by part", () => {
    assert.equal(matchInstructor(instructors, "Sam Hochstadt")?.[0], "Tobin-Hochstadt,Sam");
  });

  it("refuses ambiguous or unknown names", () => {
    assert.equal(matchInstructor(instructors, "Pat Smith"), null);
    assert.equal(matchInstructor(instructors, "Staff"), null);
  });
});

describe("pickTeacher", () => {
  const teacher = (firstName, lastName, numRatings) => ({
    legacyId: numRatings,
    firstName,
    lastName,
    department: "",
    avgRating: 4,
    avgDifficulty: 3,
    numRatings,
    wouldTakeAgainPercent: -1,
  });

  it("prefers the profile with the most ratings", () => {
    const picked = pickTeacher([teacher("Chung-chieh", "Shan", 0), teacher("Chung-chien", "Shan", 20)], {
      first: "Chung-chieh",
      last: "Shan",
    });
    assert.equal(picked?.numRatings, 20);
  });

  it("rejects different first names", () => {
    assert.equal(pickTeacher([teacher("Robert", "Shan", 9)], { first: "Chung-chieh", last: "Shan" }), null);
  });
});
