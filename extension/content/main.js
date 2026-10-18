import { request } from "../lib/messages.js";
import { loadSettings, onSettingsChanged } from "../lib/settings.js";
import { createStyler } from "../ui/styles.js";
import { createBadger } from "./badges.js";
import { createChipper } from "./chips.js";
import { createHostFactory, hostsIn, isHost } from "./hosts.js";
import { createPopover } from "./popover.js";

/** @typedef {import("../lib/types.js").Course} Course */

const RESCAN_DELAY_MS = 250;

export async function start() {
  let settings = await loadSettings();
  const getSettings = () => settings;
  const mountHost = createHostFactory(await createStyler(), getSettings);
  const popover = createPopover(mountHost, getSettings);

  /** @type {Map<string, Course | null>} */
  const known = new Map();
  /** @param {Iterable<string>} codes */
  async function resolve(codes) {
    const missing = [...new Set(codes)].filter((c) => !known.has(c));
    const found = missing.length ? await request({ type: "courses", codes: missing }) : null;
    if (found) for (const code of missing) known.set(code, found[code] ?? null);
    return known;
  }

  const annotateBadges = createBadger({ mountHost, popover, resolve, getSettings });
  const annotateChips = createChipper({ mountHost, resolve, getSettings });

  /** @returns {(Document | ShadowRoot)[]} */
  function roots() {
    /** @type {(Document | ShadowRoot)[]} */
    const all = [document];
    for (const root of all) {
      for (const el of root.querySelectorAll("*")) if (el.shadowRoot) all.push(el.shadowRoot);
    }
    return all;
  }

  let running = false;
  let timer = 0;
  const schedule = () => {
    clearTimeout(timer);
    timer = setTimeout(scan, RESCAN_DELAY_MS);
  };

  const observers = new Map();
  /** @param {MutationRecord[]} mutations */
  const onMutations = (mutations) => {
    const ours = mutations.every((m) => m.type === "childList" && [...m.addedNodes, ...m.removedNodes].every(isHost));
    if (!ours) schedule();
  };

  /** @param {...("badge" | "chip" | "popover")} kinds */
  const removeHosts = (...kinds) => {
    for (const root of roots()) for (const kind of kinds) for (const host of hostsIn(root, kind)) host.remove();
  };

  async function scan() {
    if (!chrome.runtime?.id) {
      clearTimeout(timer);
      for (const observer of observers.values()) observer.disconnect();
      return;
    }
    if (running) return schedule();
    running = true;
    try {
      for (const root of roots()) {
        if (!observers.has(root)) {
          const observer = new MutationObserver(onMutations);
          observer.observe(root instanceof Document ? root.body : root, {
            childList: true,
            subtree: true,
            characterData: true,
          });
          observers.set(root, observer);
        }
        if (settings.badges) await annotateBadges(root);
        if (settings.chips) await annotateChips(root);
      }
    } finally {
      running = false;
    }
  }

  onSettingsChanged((next) => {
    settings = next;
    popover.close(true);
    removeHosts("badge", "chip");
    void scan();
  });

  removeHosts("badge", "chip", "popover");
  await scan();
}
