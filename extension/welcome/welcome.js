import { request } from "../lib/messages.js";
import { REGISTRAR, SIGN_IN_URL, syncGrades } from "../lib/registrar.js";

const ORIGINS = { origins: [`${REGISTRAR}/*`] };

/** @param {string} id */
function byId(id) {
  const el = document.getElementById(id);
  if (!el) throw new Error(`Missing #${id}`);
  return el;
}

const load = /** @type {HTMLButtonElement} */ (byId("load"));
const status = byId("status");
const openStellic = byId("open-stellic");

/** @param {string} text @param {boolean} [ready] */
function show(text, ready = false) {
  status.textContent = text;
  openStellic.hidden = !ready;
}

async function showLoaded() {
  const loaded = await request({ type: "status" });
  if (!loaded) return;
  const date = new Date(loaded.syncedAt).toLocaleDateString(undefined, { dateStyle: "medium" });
  show(`${loaded.courses.toLocaleString()} courses loaded on ${date}.`, true);
  load.textContent = "Refresh grade data";
}

byId("sign-in").addEventListener("click", async () => {
  if (await chrome.permissions.request(ORIGINS)) await chrome.tabs.create({ url: SIGN_IN_URL });
});

load.addEventListener("click", async () => {
  if (!(await chrome.permissions.request(ORIGINS))) {
    return show("The extension needs permission to read the registrar site.");
  }
  load.disabled = true;
  try {
    const signedIn = await syncGrades((term, done, total) => show(`Loading ${term.label} (${done + 1} of ${total})`));
    if (signedIn) await showLoaded();
    else show("Sign in to IU first, then press Load grade data again.");
  } catch (error) {
    show(`Could not load the grade data. ${error instanceof Error ? error.message : error}`);
  } finally {
    load.disabled = false;
  }
});

await showLoaded();
