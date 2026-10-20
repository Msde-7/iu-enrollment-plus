/**
 * @typedef {number[]} GradeCounts Fourteen counts: A+ through F, then W.
 *
 * @typedef {object} Benchmark
 * @property {number | null} gpa
 * @property {number} n Graded students.
 * @property {GradeCounts} c
 * @property {number} s Sections.
 *
 * @typedef {Benchmark & { lt: string, lk: number }} Stats
 * `lt` is the latest term label such as "FA25" and `lk` is its sortable key.
 *
 * @typedef {Stats & { t: string, i: Record<string, Stats> }} CourseRecord
 * `t` is the title and `i` maps registrar instructor names ("Last,First") to stats.
 *
 * @typedef {object} GradeData
 * @property {Record<string, Benchmark>} levels
 * @property {Record<string, Benchmark>} deptLevels
 * @property {Record<string, CourseRecord>} courses
 * @property {number} [syncedAt]
 *
 * @typedef {{ courses: number, syncedAt: number }} GradeStatus
 *
 * @typedef {Benchmark & { label: string }} LabeledBenchmark
 *
 * @typedef {CourseRecord & {
 *   key: string,
 *   bench: { dept: LabeledBenchmark | null, level: LabeledBenchmark | null },
 * }} Course
 *
 * @typedef {object} Rating
 * @property {number} id
 * @property {string} name
 * @property {string} dept
 * @property {number} rating
 * @property {number} difficulty
 * @property {number} count
 * @property {number} again Percent who would take again, or -1 when unknown.
 *
 * @typedef {object} Settings
 * @property {boolean} badges
 * @property {"gpa" | "a" | "both"} metric
 * @property {boolean} delta
 * @property {boolean} chips
 * @property {boolean} rmp
 * @property {"hover" | "click"} openOn
 * @property {"color" | "crimson" | "mono"} theme
 * @property {boolean} compact
 *
 * @typedef {{ type: "courses", codes: string[] }
 *   | { type: "search", text: string }
 *   | { type: "rating", instructor: string }
 *   | { type: "status" }} Request
 *
 * @typedef {{
 *   courses: Record<string, Course>,
 *   search: Course[],
 *   rating: Rating | null,
 *   status: GradeStatus | null,
 * }} Responses
 */

export {};
