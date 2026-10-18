/** @typedef {(root: ShadowRoot) => void} Styler */

/** Loads the shared stylesheet once and returns a function that adopts it into a shadow root. @returns {Promise<Styler>} */
export async function createStyler() {
  const sheet = new CSSStyleSheet();
  sheet.replaceSync(await fetch(chrome.runtime.getURL("ui/styles.css")).then((r) => r.text()));
  return (root) => {
    root.adoptedStyleSheets = [sheet];
  };
}
