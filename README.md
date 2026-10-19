<div align="center">

<img src="extension/icons/icon-128.png" alt="" width="80">

# IU Enrollment Plus

**See real grade distributions and professor ratings for every course, right inside Stellic.**

[![Add to Chrome](https://img.shields.io/badge/Add_to_Chrome-Free-990000?style=for-the-badge&logo=googlechrome&logoColor=white)](https://chromewebstore.google.com/detail/iu-enrollment-plus/dmjmeekdlkeeeiknhpgafdookkdkfklb)

[![Chrome Web Store version](https://img.shields.io/chrome-web-store/v/dmjmeekdlkeeeiknhpgafdookkdkfklb?label=Chrome%20Web%20Store&color=4285F4)](https://chromewebstore.google.com/detail/iu-enrollment-plus/dmjmeekdlkeeeiknhpgafdookkdkfklb)
![Edge](https://img.shields.io/badge/Edge-supported-0078D7?logo=microsoftedge&logoColor=white)
[![License](https://img.shields.io/badge/license-MIT-green)](LICENSE)

<img src="docs/images/course-search.png" alt="Course search in Stellic with a GPA badge beside every course" width="820">

</div>

> [!IMPORTANT]
> IU Enrollment Plus is an independent student project. It is **not affiliated with, endorsed by or sponsored by
> Indiana University, Stellic or RateMyProfessors.** All names and trademarks belong to their owners.

## Install

### Chrome

Open **[IU Enrollment Plus on the Chrome Web Store](https://chromewebstore.google.com/detail/iu-enrollment-plus/dmjmeekdlkeeeiknhpgafdookkdkfklb)** and click **Add to Chrome**. It updates automatically.

### Edge

Open the same [Chrome Web Store page](https://chromewebstore.google.com/detail/iu-enrollment-plus/dmjmeekdlkeeeiknhpgafdookkdkfklb). If Edge shows a banner, click **Allow extensions from other stores**,
then click **Get** or **Add to Chrome**.

### Then open Stellic

A welcome tab opens with a quick tour. Go to [stellic.iu.edu](https://stellic.iu.edu) and badges appear next to every
course. Pin the extension from the puzzle piece icon in the toolbar to reach search and settings in one click.

<details>
<summary>Install from source instead</summary>

1. Click **[Download ZIP](https://github.com/Msde-7/iu-enrollment-plus/archive/refs/heads/main.zip)** and unzip it
   somewhere you will keep it
2. Go to `chrome://extensions` or `edge://extensions` and turn on **Developer mode**
3. Click **Load unpacked** and select the unzipped folder's `extension` folder

To update, download the ZIP again, replace the folder, and click the reload arrow on the extension's card.

</details>

## What you can do with it

<img src="docs/images/grade-card.png" alt="Grade card with histogram, department comparison and instructor ratings" width="380" align="right">

**Spot the easy A and the weed-out course.** Every course code gets a badge with its average GPA since 2016, colored
from green to red. The arrow shows whether it grades higher or lower than its department at the same level.

**Look before you enroll.** Hover a badge for the full picture. You get the grade histogram, how many students got an
A, how many withdrew, and when it was last offered.

**Compare it to everything else.** Each card shows how the course stacks up against its department and against all
of IU at that level, so a 3.0 in a tough department reads differently from a 3.0 in an easy one.

**Pick the professor, not just the class.** The card lists every instructor who taught the course with their own GPA,
share of A grades and RateMyProfessors rating. Click a column to sort.

**Read the syllabus first.** The card links to the course's syllabi on IU's
[Class Syllabus Search](https://syllabi.iu.edu) for the last term it was taught, and each instructor's term links to
their syllabus.

**Choose the right section.** In a course panel and in the section picker, each instructor gets a chip with their GPA
and rating for that course.

**Weigh your requirement options.** Expand a requirement in Track Progress and every course that satisfies it shows
its badge, so you can compare them side by side.

**Make it yours.** The toolbar popup searches any course and lets you choose what the badge shows, switch between
hover and click, hide chips or ratings, and pick a color theme.

<br clear="right">

## Privacy

Everything runs in your browser. Grade data ships inside the extension, and the only network request it makes is
to RateMyProfessors to look up instructor ratings, which are cached for a week. It doesn't collect, store or send
anything about you or your Stellic account.

## Where the data comes from

Grades come from the public
[IU Registrar grade distribution reports](https://gradedistribution.registrar.indiana.edu/) for Bloomington, from
2016 through 2026. IU withholds sections with very few students, and those show as **no grades**. Ratings come from
[RateMyProfessors](https://www.ratemyprofessors.com/).

**This project is not affiliated with, endorsed by or sponsored by Indiana University, Stellic or RateMyProfessors.**

<details>
<summary><b>For developers</b></summary>

### Layout

```
extension/
  manifest.json      Manifest V3
  background.js      service worker for grade lookups and the RateMyProfessors cache
  content/           content script, where loader.js imports main.js as an ES module
  lib/               pure logic shared by every context and covered by unit tests
  ui/                card, badge, DOM helper and the shared stylesheet
  popup/             toolbar popup
  data/grades.json   generated by tools/build_data.py
tools/build_data.py  turns the registrar's per-term CSVs into grades.json
tests/               node:test, pytest and end-to-end suites
```

### Checks

Needs Node 22 or later and Python 3.11 or later with ruff, mypy and pytest.

```bash
npm install
npm run check
```

That runs ESLint, Prettier, a strict TypeScript check of the JSDoc types, the JS unit tests, and ruff, strict mypy
and pytest for the build script.

The end-to-end test loads the extension into a real browser against a mock Stellic page. Pass it the path to Edge,
or to [Chrome for Testing](https://developer.chrome.com/blog/chrome-for-testing) since branded Chrome ignores
`--load-extension`.

```bash
npm run test:e2e -- "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe"
```

### Updating the data

Download each term from the registrar site as `IUB_GradeDistribution_<year>_<term>.csv`, then rebuild.

```bash
npm run build:data -- <csv-folder> extension/data/grades.json --since 2016
```

</details>

## License

[MIT](LICENSE)
