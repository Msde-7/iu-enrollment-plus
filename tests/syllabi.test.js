import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { syllabusUrl } from "../extension/lib/syllabi.js";

describe("syllabusUrl", () => {
  it("searches the course in the given term", () => {
    assert.equal(syllabusUrl("CSCI-C 211", 4262), "https://syllabi.iu.edu/?keyword=CSCI-C+211&srcdb=4262");
  });

  it("returns null for terms before the archive starts", () => {
    assert.equal(syllabusUrl("CSCI-C 211", 4252), null);
  });
});
