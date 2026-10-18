/**
 * @typedef {object} Props
 * @property {string} [className]
 * @property {string} [title]
 * @property {Record<string, string>} [attrs]
 * @property {Record<string, string>} [style]
 * @property {Partial<Record<keyof HTMLElementEventMap, EventListener>>} [on]
 */

/** @typedef {Node | string | number | null | undefined | false} Child */

/**
 * @template {keyof HTMLElementTagNameMap} K
 * @param {K} tag
 * @param {Props | null} [props]
 * @param {...Child} children
 * @returns {HTMLElementTagNameMap[K]}
 */
export function h(tag, props, ...children) {
  const el = document.createElement(tag);
  if (props?.className) el.className = props.className;
  if (props?.title) el.title = props.title;
  for (const [name, value] of Object.entries(props?.attrs ?? {})) el.setAttribute(name, value);
  for (const [name, value] of Object.entries(props?.style ?? {})) el.style.setProperty(name, value);
  for (const [type, listener] of Object.entries(props?.on ?? {})) if (listener) el.addEventListener(type, listener);
  for (const child of children) {
    if (child == null || child === false) continue;
    el.append(typeof child === "number" ? String(child) : child);
  }
  return el;
}
