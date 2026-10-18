from build_data import GRADES, Section, Tally, aggregate, build, parse_row


def row(**overrides: str) -> dict[str, str]:
    base = dict.fromkeys(GRADES, "0")
    base.update(
        {
            "TERM": "4258",
            "TERM DESCRIPTION": "FA25",
            "SUBJECT": "CSCI-C",
            "COURSE": "211",
            "COURSE DESCRIPTION": "INTRO TO COMPUTER SCIENCE",
            "INSTRUCTOR NAME": "Shan,Chung-chieh",
            "SMALL CLASS NOTATION": "",
            "WX": "0",
        },
    )
    base.update(overrides)
    return base


def test_parse_row_folds_wx_into_w() -> None:
    section = parse_row(row(A="3", W="1", WX="2"))
    assert section is not None
    assert section.counts[GRADES.index("A")] == 3
    assert section.counts[GRADES.index("W")] == 3


def test_parse_row_skips_small_and_empty_sections() -> None:
    assert parse_row(row(A="5", **{"SMALL CLASS NOTATION": "NOT AVAILABLE"})) is None
    assert parse_row(row()) is None


def test_tally_gpa_and_latest_term() -> None:
    tally = Tally()
    tally.add([1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2, 5], term="SP25", term_key=4252)
    tally.add([0] * 14, term="FA25", term_key=4258)
    assert tally.gpa() == 2.0
    assert tally.stats()["lt"] == "FA25"
    assert tally.sections == 2


def test_build_produces_benchmarks() -> None:
    counts = tuple([2] + [0] * 13)
    sections = [
        Section("CSCI-C 211", "INTRO", "Shan,Chung-chieh", "FA25", 4258, counts),
        Section("CSCI-C 212", "SYSTEMS", "", "FA25", 4258, counts),
    ]
    data = build(aggregate(sections))
    assert data["levels"]["200"]["s"] == 2
    assert data["deptLevels"]["CSCI|200"]["gpa"] == 4.0
    assert list(data["courses"]["CSCI-C 211"]["i"]) == ["Shan,Chung-chieh"]
    assert data["courses"]["CSCI-C 212"]["i"] == {}
