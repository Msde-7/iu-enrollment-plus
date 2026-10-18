/** @typedef {import("./types.js").Settings} Settings */

/** @type {Readonly<Settings>} */
export const DEFAULT_SETTINGS = Object.freeze({
  badges: true,
  metric: "gpa",
  delta: true,
  chips: true,
  rmp: true,
  openOn: "hover",
  theme: "color",
  compact: false,
});

/** @returns {Promise<Settings>} */
export async function loadSettings() {
  const stored = await chrome.storage.sync.get({ ...DEFAULT_SETTINGS });
  return { ...DEFAULT_SETTINGS, ...stored };
}

/** @template {keyof Settings} K @param {K} key @param {Settings[K]} value */
export function saveSetting(key, value) {
  return chrome.storage.sync.set({ [key]: value });
}

/** @param {(settings: Settings) => void} listener */
export function onSettingsChanged(listener) {
  chrome.storage.onChanged.addListener(async (_changes, area) => {
    if (area === "sync") listener(await loadSettings());
  });
}
