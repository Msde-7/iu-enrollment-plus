import { renderCard } from "../ui/card.js";
import { h } from "../ui/dom.js";

/**
 * @typedef {import("../lib/types.js").Course} Course
 * @typedef {import("../lib/types.js").Settings} Settings
 * @typedef {import("./hosts.js").MountHost} MountHost
 */

const OPEN_DELAY_MS = 380;
const SWITCH_DELAY_MS = 80;
const CLOSE_DELAY_MS = 220;
const FADE_MS = 150;
const MARGIN = 8;
const GAP = 6;
const SIDE_LIFT = 48;

/**
 * One floating grade card at a time. Hovering previews it and clicking pins it open.
 * @param {MountHost} mountHost
 * @param {() => Settings} getSettings
 */
export function createPopover(mountHost, getSettings) {
  /** @type {{ host: HTMLElement, root: HTMLElement } | null} */
  let layer = null;
  /** @type {HTMLElement | null} */
  let card = null;
  /** @type {HTMLElement | null} */
  let anchor = null;
  let pinned = false;
  let openTimer = 0;
  let closeTimer = 0;
  const resize = new ResizeObserver(() => place());

  function ensureLayer() {
    if (layer?.host.isConnected) return layer;
    layer = mountHost("popover");
    layer.host.style.cssText = "all: initial; position: fixed; inset: 0 auto auto 0; z-index: 2147483647;";
    document.documentElement.append(layer.host);
    return layer;
  }

  /** Below or above the badge when the card fits, otherwise beside it, so the badge stays visible. */
  function place() {
    if (!card || !anchor) return;
    const box = anchor.getBoundingClientRect();
    const { offsetWidth: width, offsetHeight: height } = card;
    /** @param {number} value @param {number} max */
    const clamp = (value, max) => Math.min(Math.max(MARGIN, value), max - MARGIN);
    let left = clamp(box.left, innerWidth - width);
    let top;
    let origin = "top left";

    if (box.bottom + GAP + height <= innerHeight - MARGIN) {
      top = box.bottom + GAP;
    } else if (box.top - GAP - height >= MARGIN) {
      top = box.top - GAP - height;
      origin = "bottom left";
    } else {
      const right = box.right + GAP;
      const leftSide = box.left - GAP - width;
      left = right + width <= innerWidth - MARGIN ? right : leftSide >= MARGIN ? leftSide : left;
      top = clamp(box.top - SIDE_LIFT, innerHeight - height);
      origin = left > box.left ? "top left" : "top right";
    }
    card.style.left = `${left}px`;
    card.style.top = `${top}px`;
    card.style.transformOrigin = origin;
  }

  /** @param {boolean} value */
  function setPinned(value) {
    pinned = value;
    anchor?.classList.toggle("pinned", value);
  }

  function clearTimers() {
    clearTimeout(openTimer);
    clearTimeout(closeTimer);
  }

  function close(immediate = false) {
    clearTimers();
    resize.disconnect();
    setPinned(false);
    const closing = card;
    card = null;
    anchor = null;
    if (!closing) return;
    if (immediate) return closing.remove();
    closing.classList.remove("open");
    setTimeout(() => closing.remove(), FADE_MS);
  }

  /** @param {HTMLElement} target @param {Course} course @param {boolean} pin */
  function open(target, course, pin) {
    clearTimers();
    if (anchor === target && card) return setPinned(pin || pinned);

    close(true);
    const { root } = ensureLayer();
    root.className = `root theme-${getSettings().theme}`;
    anchor = target;
    setPinned(pin);
    card = h(
      "div",
      {
        className: "pop",
        attrs: { role: "dialog", "aria-label": `${course.key} grade distribution` },
        on: {
          mouseenter: () => clearTimeout(closeTimer),
          mouseleave: () => scheduleClose(),
          mousedown: () => setPinned(true),
        },
      },
      h("button", { className: "x", attrs: { "aria-label": "Close" }, on: { click: () => close() } }, "✕"),
      renderCard(course, getSettings()),
    );
    root.append(card);
    place();
    resize.observe(card);
    requestAnimationFrame(() => card?.classList.add("open"));
  }

  function scheduleClose() {
    clearTimeout(openTimer);
    if (!pinned) closeTimer = setTimeout(close, CLOSE_DELAY_MS);
  }

  /** @param {EventTarget[]} path */
  const owns = (path) => Boolean((layer && path.includes(layer.host)) || (anchor && path.includes(anchor)));

  addEventListener("mousedown", (e) => owns(e.composedPath()) || close(), true);
  addEventListener("keydown", (e) => e.key === "Escape" && close(), true);
  addEventListener("scroll", (e) => pinned || owns(e.composedPath()) || close(true), { capture: true, passive: true });

  return {
    /** @param {HTMLElement} target @param {Course} course */
    toggle(target, course) {
      if (anchor === target && pinned) close();
      else open(target, course, true);
    },
    /** @param {HTMLElement} target @param {Course} course */
    hover(target, course) {
      clearTimers();
      if (pinned) return;
      openTimer = setTimeout(() => open(target, course, false), card ? SWITCH_DELAY_MS : OPEN_DELAY_MS);
    },
    leave: scheduleClose,
    close,
  };
}
