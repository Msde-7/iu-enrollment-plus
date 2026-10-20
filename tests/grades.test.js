import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { GRADES, createGradeBuilder, parseCsv } from "../extension/lib/grades.js";
import { termsIn } from "../extension/lib/registrar.js";

const HEADER = ["TERM", "TERM DESCRIPTION", "SUBJECT", "COURSE", "COURSE DESCRIPTION", "INSTRUCTOR NAME"];
const COLUMNS = [...HEADER, "SMALL CLASS NOTATION", ...GRADES, "WX"];

/** @param {Record<string, string | number>} values */
const line = (values) => COLUMNS.map((c) => `"${values[c] ?? ""}"`).join(",");
/** @param {Record<string, string | number>[]} rows */
const csv = (rows) => [COLUMNS.map((c) => `"${c}"`).join(","), ...rows.map(line)].join("\r\n");

const section = {
  TERM: "4258",
  "TERM DESCRIPTION": "FA25",
  SUBJECT: "CSCI-C",
  COURSE: "211",
  "COURSE DESCRIPTION": "INTRO TO COMPUTER SCIENCE",
  "INSTRUCTOR NAME": "Shan,Chung-chieh",
};

describe("csv", () => {
  it("handles quotes, embedded commas and CRLF", () => {
    assert.deepEqual(parseCsv('a,"b, c","say ""hi"""\r\n1,2,3'), [
      ["a", "b, c", 'say "hi"'],
      ["1", "2", "3"],
    ]);
  });
});

describe("grade builder", () => {
  it("folds WX into W and skips small or empty sections", () => {
    const builder = createGradeBuilder();
    builder.add(
      csv([
        { ...section, A: 3, W: 1, WX: 2 },
        { ...section, A: 5, "SMALL CLASS NOTATION": "NOT AVAILABLE" },
        { ...section, COURSE: "212" },
      ]),
    );
    const { courses } = builder.build();
    assert.deepEqual(Object.keys(courses), ["CSCI-C 211"]);
    assert.equal(courses["CSCI-C 211"].c[GRADES.indexOf("A")], 3);
    assert.equal(courses["CSCI-C 211"].c[GRADES.indexOf("W")], 3);
  });

  it("tracks GPA, sections and the latest term across exports", () => {
    const builder = createGradeBuilder();
    builder.add(csv([{ ...section, TERM: "4252", "TERM DESCRIPTION": "SP25", "A+": 1, A: 1, F: 2 }]));
    builder.add(csv([{ ...section, B: 4 }]));
    const course = builder.build().courses["CSCI-C 211"];
    assert.equal(course.gpa, 2.5);
    assert.equal(course.s, 2);
    assert.equal(course.lt, "FA25");
    assert.equal(course.i["Shan,Chung-chieh"].s, 2);
  });

  it("produces level and department benchmarks", () => {
    const builder = createGradeBuilder();
    builder.add(
      csv([
        { ...section, A: 2 },
        { ...section, COURSE: "212", "INSTRUCTOR NAME": "", A: 2 },
      ]),
    );
    const data = builder.build();
    assert.equal(data.levels["200"].s, 2);
    assert.equal(data.deptLevels["CSCI|200"].gpa, 4);
    assert.deepEqual(data.courses["CSCI-C 212"].i, {});
  });

  it("rejects pages that are not exports", () => {
    assert.throws(() => createGradeBuilder().add("<html>IU Login</html>"));
  });
});

describe("registrar terms", () => {
  it("keeps terms since 2016, oldest first", () => {
    const html = `<select name="term"><option value="all">All Terms</option>
      <option value="4258">Fall 2025</option><option value="4162" >Spring 2016</option>
      <option value="4158">Fall 2015</option></select>`;
    assert.deepEqual(termsIn(html), [
      { code: "4162", label: "Spring 2016" },
      { code: "4258", label: "Fall 2025" },
    ]);
  });
});
