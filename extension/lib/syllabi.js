const SEARCH_URL = "https://syllabi.iu.edu/";
const FIRST_TERM = 4258;

/**
 * Link to IU's class syllabus search for a course in a given term, or null when the term predates the archive.
 * @param {string} code Normalized course code such as "CSCI-C 211".
 * @param {number} termKey Registrar term code such as 4262 for Spring 2026.
 */
export function syllabusUrl(code, termKey) {
  if (termKey < FIRST_TERM) return null;
  const url = new URL(SEARCH_URL);
  url.searchParams.set("keyword", code);
  url.searchParams.set("srcdb", String(termKey));
  return url.href;
}
