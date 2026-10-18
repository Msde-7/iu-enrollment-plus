/**
 * @typedef {import("../lib/types.js").Settings} Settings
 * @typedef {import("../ui/styles.js").Styler} Styler
 * @typedef {"badge" | "chip" | "popover"} HostKind
 * @typedef {(kind: HostKind, data?: Record<string, string>) => { host: HTMLElement, root: HTMLElement }} MountHost
 */

const HOST_ATTR = "data-iug-host";

/**
 * Every element the extension draws lives in a closed shadow root so the page's CSS can't touch it.
 * @param {Styler} applyStyles
 * @param {() => Settings} getSettings
 * @returns {MountHost}
 */
export function createHostFactory(applyStyles, getSettings) {
  return (kind, data = {}) => {
    const { theme, compact } = getSettings();
    const host = document.createElement("span");
    host.setAttribute(HOST_ATTR, kind);
    Object.assign(host.dataset, data);
    host.style.cssText = "all: initial; display: inline-block; vertical-align: middle; line-height: 0;";

    const shadow = host.attachShadow({ mode: "closed" });
    applyStyles(shadow);
    const root = document.createElement("span");
    root.className = `root theme-${theme}${compact ? " compact" : ""}`;
    root.style.lineHeight = "normal";
    shadow.append(root);
    return { host, root };
  };
}

/** @param {ParentNode} root @param {HostKind} kind @returns {HTMLElement[]} */
export function hostsIn(root, kind) {
  return Array.from(root.querySelectorAll(`[${HOST_ATTR}="${kind}"]`));
}

/** @param {Node} node */
export const isHost = (node) => node instanceof Element && node.hasAttribute(HOST_ATTR);
