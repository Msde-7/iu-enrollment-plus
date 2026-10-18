"""Aggregate IU Registrar grade-distribution CSVs into the extension's grades.json."""

from __future__ import annotations

import argparse
import csv
import json
import re
from dataclasses import dataclass, field
from pathlib import Path
from typing import TYPE_CHECKING, Any

if TYPE_CHECKING:
    from collections.abc import Iterable, Iterator

GRADES = ("A+", "A", "A-", "B+", "B", "B-", "C+", "C", "C-", "D+", "D", "D-", "F", "W")
POINTS = (4.0, 4.0, 3.7, 3.3, 3.0, 2.7, 2.3, 2.0, 1.7, 1.3, 1.0, 0.7, 0.0)
CSV_GLOB = "IUB_GradeDistribution_*.csv"
YEAR_IN_NAME = re.compile(r"_(\d{4})_")
TERM_NUMBER = re.compile(r"\d+")


@dataclass
class Tally:
    counts: list[int] = field(default_factory=lambda: [0] * len(GRADES))
    sections: int = 0
    latest_term: str = ""
    latest_key: int = 0

    def add(self, counts: Iterable[int], sections: int = 1, term: str = "", term_key: int = 0) -> None:
        self.counts = [a + b for a, b in zip(self.counts, counts, strict=True)]
        self.sections += sections
        if term_key > self.latest_key:
            self.latest_key, self.latest_term = term_key, term

    def gpa(self) -> float | None:
        graded = sum(self.counts[: len(POINTS)])
        if not graded:
            return None
        return round(sum(p * n for p, n in zip(POINTS, self.counts, strict=False)) / graded, 2)

    def benchmark(self) -> dict[str, Any]:
        return {"gpa": self.gpa(), "n": sum(self.counts[: len(POINTS)]), "c": self.counts, "s": self.sections}

    def stats(self) -> dict[str, Any]:
        return {**self.benchmark(), "lt": self.latest_term, "lk": self.latest_key}


@dataclass
class Course:
    title: str
    total: Tally = field(default_factory=Tally)
    instructors: dict[str, Tally] = field(default_factory=dict)


@dataclass(frozen=True)
class Section:
    key: str
    title: str
    instructor: str
    term: str
    term_key: int
    counts: tuple[int, ...]


def parse_row(row: dict[str, str]) -> Section | None:
    if row.get("SMALL CLASS NOTATION"):
        return None
    try:
        counts = [int(row[g] or 0) for g in GRADES]
        counts[-1] += int(row.get("WX") or 0)
        term_match = TERM_NUMBER.match(row["TERM"])
    except (KeyError, ValueError):
        return None
    if not sum(counts) or not term_match:
        return None
    return Section(
        key=f"{row['SUBJECT'].strip()} {row['COURSE'].strip()}",
        title=row["COURSE DESCRIPTION"].strip(),
        instructor=row["INSTRUCTOR NAME"].strip(),
        term=row["TERM DESCRIPTION"].strip(),
        term_key=int(term_match.group()),
        counts=tuple(counts),
    )


def read_sections(csv_dir: Path, since: int) -> Iterator[Section]:
    for path in sorted(csv_dir.glob(CSV_GLOB)):
        year = YEAR_IN_NAME.search(path.name)
        if not year or int(year.group(1)) < since:
            continue
        with path.open(newline="", encoding="utf-8", errors="replace") as file:
            for row in csv.DictReader(file):
                if section := parse_row(row):
                    yield section


def aggregate(sections: Iterable[Section]) -> dict[str, Course]:
    courses: dict[str, Course] = {}
    for s in sections:
        course = courses.setdefault(s.key, Course(title=s.title))
        course.total.add(s.counts, term=s.term, term_key=s.term_key)
        if s.instructor:
            course.instructors.setdefault(s.instructor, Tally()).add(s.counts, term=s.term, term_key=s.term_key)
    return courses


def benchmarks(courses: dict[str, Course]) -> tuple[dict[str, Tally], dict[str, Tally]]:
    levels: dict[str, Tally] = {}
    dept_levels: dict[str, Tally] = {}
    for key, course in courses.items():
        subject, number = key.split(" ")
        level = f"{number[0]}00"
        for table, bucket in ((levels, level), (dept_levels, f"{subject.split('-')[0]}|{level}")):
            table.setdefault(bucket, Tally()).add(course.total.counts, sections=course.total.sections)
    return levels, dept_levels


def build(courses: dict[str, Course]) -> dict[str, Any]:
    levels, dept_levels = benchmarks(courses)
    return {
        "levels": {k: t.benchmark() for k, t in levels.items()},
        "deptLevels": {k: t.benchmark() for k, t in dept_levels.items()},
        "courses": {
            key: {
                "t": course.title,
                **course.total.stats(),
                "i": {name: tally.stats() for name, tally in course.instructors.items()},
            }
            for key, course in courses.items()
        },
    }


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("csv_dir", type=Path, help=f"folder containing {CSV_GLOB}")
    parser.add_argument("output", type=Path, help="path to write grades.json")
    parser.add_argument("--since", type=int, default=0, help="first year to include")
    args = parser.parse_args()

    data = build(aggregate(read_sections(args.csv_dir, args.since)))
    args.output.write_text(json.dumps(data, separators=(",", ":")), encoding="utf-8")
    size_mb = args.output.stat().st_size / 1e6
    print(f"Wrote {len(data['courses'])} courses to {args.output} ({size_mb:.1f} MB)")


if __name__ == "__main__":
    main()
