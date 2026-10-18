// Loads the extension into a real Chromium browser against a mock Stellic page and checks what it renders.
// Pass the path to Edge or Chrome for Testing, since branded Chrome ignores --load-extension.
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { createServer } from "node:http";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { setTimeout as sleep } from "node:timers/promises";

const browserPath = process.argv[2];
if (!browserPath) throw new Error("Usage: node tests/e2e/run.mjs <path-to-chrome-or-edge>");

const root = new URL("../../", import.meta.url);
const page = readFileSync(new URL("tests/e2e/mock-stellic.html", root));
const DEBUG_PORT = 9333;

const workDir = mkdtempSync(join(tmpdir(), "iug-e2e-"));
const extDir = join(workDir, "extension");
cpSync(new URL("extension", root), extDir, { recursive: true });

const server = createServer((_req, res) => res.writeHead(200, { "Content-Type": "text/html" }).end(page));
await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
const siteUrl = `http://127.0.0.1:${/** @type {import("node:net").AddressInfo} */ (server.address()).port}/`;

const manifestPath = join(extDir, "manifest.json");
const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
for (const entry of [...manifest.content_scripts, ...manifest.web_accessible_resources]) {
  entry.matches.push("http://127.0.0.1/*");
}
writeFileSync(manifestPath, JSON.stringify(manifest));
const hostsPath = join(extDir, "content", "hosts.js");
writeFileSync(hostsPath, readFileSync(hostsPath, "utf8").replace('mode: "closed"', 'mode: "open"'));

const browser = spawn(
  browserPath,
  [
    "--headless=new",
    `--remote-debugging-port=${DEBUG_PORT}`,
    `--user-data-dir=${join(workDir, "profile")}`,
    `--load-extension=${extDir}`,
    `--disable-extensions-except=${extDir}`,
    "--no-first-run",
    "--no-default-browser-check",
    "about:blank",
  ],
  { stdio: "ignore" },
);

/** @param {string} path @param {string} [method] */
async function devtools(path, method = "GET") {
  for (let attempt = 0; ; attempt++) {
    try {
      return await (await fetch(`http://127.0.0.1:${DEBUG_PORT}${path}`, { method })).json();
    } catch (error) {
      if (attempt > 50) throw error;
      await sleep(200);
    }
  }
}

/** @param {string} wsUrl @param {string} expression */
async function evaluate(wsUrl, expression) {
  const ws = new WebSocket(wsUrl);
  await new Promise((resolve) => ws.addEventListener("open", resolve, { once: true }));
  const reply = new Promise((resolve) =>
    ws.addEventListener("message", (e) => resolve(JSON.parse(e.data)), { once: true }),
  );
  ws.send(JSON.stringify({ id: 1, method: "Runtime.evaluate", params: { expression, returnByValue: true } }));
  const { result } = await reply;
  ws.close();
  return result.result.value;
}

const RENDERED = `(() => {
  const roots = [document];
  for (const r of roots) for (const el of r.querySelectorAll("*")) if (el.shadowRoot) roots.push(el.shadowRoot);
  return roots
    .flatMap((r) => [...r.querySelectorAll("[data-iug-host]")])
    .filter((h) => h.dataset.iugHost !== "popover")
    .map((h) => ({ kind: h.dataset.iugHost, key: h.dataset.code ?? h.dataset.name, text: h.shadowRoot.textContent }));
})()`;

try {
  await devtools("/json/version");
  const tab = await devtools(`/json/new?${siteUrl}`, "PUT");
  await sleep(6000);
  const hosts = await evaluate(tab.webSocketDebuggerUrl, RENDERED);
  const byKey = Object.fromEntries(hosts.map((h) => [h.key, h]));
  console.table(hosts);

  assert.equal(hosts.length, 6, "expected four badges and two chips");
  assert.match(byKey["ECON-E 201"]?.text ?? "", /GPA/, "re-rendered card gets a fresh badge");
  assert.equal(byKey["CSCI-C 211"], undefined, "stale badge removed after re-render");
  assert.match(byKey["MATH-M 211"]?.text ?? "", /\d\.\d\dGPA/);
  assert.equal(byKey["FAKE-X 999"]?.text, "no grades");
  assert.match(byKey["ECON-E 309"]?.text ?? "", /GPA/, "badge inside page shadow root");
  assert.match(byKey["Gerhard Glomm"]?.text ?? "", /GPA★ \d\.\d/, "chip shows GPA and RateMyProfessors rating");
  assert.match(byKey["John Stone"]?.text ?? "", /GPA/, "section-row chip");
  console.log("e2e passed");
} finally {
  browser.kill();
  server.close();
  await sleep(500);
  rmSync(workDir, { recursive: true, force: true, maxRetries: 5 });
}
