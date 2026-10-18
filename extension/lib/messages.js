/**
 * @typedef {import("./types.js").Request} Request
 * @typedef {import("./types.js").Responses} Responses
 */

/**
 * Sends a request to the service worker. Resolves to null if the extension was reloaded or the call failed.
 * @template {Request["type"]} T
 * @param {Extract<Request, { type: T }>} message
 * @returns {Promise<Responses[T] | null>}
 */
export async function request(message) {
  if (!chrome.runtime?.id) return null;
  try {
    const reply = await chrome.runtime.sendMessage(message);
    return reply?.ok ? reply.data : null;
  } catch {
    return null;
  }
}
