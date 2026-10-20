// Loads the extension into a real Chromium browser, loads grades from a mock registrar, and checks what a mock
// Stellic page renders.
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

const TERMS =
  '<select name="term"><option value="all">All Terms</option><option value="4258">Fall 2025</option></select>';
const EXPORT = [
  '"TERM","TERM DESCRIPTION","SUBJECT","COURSE","COURSE DESCRIPTION","INSTRUCTOR NAME","SMALL CLASS NOTATION","A","B","C"',
  ...[
    ["CSCI-C", "211", "INTRO TO COMPUTER SCIENCE", "Shan,Chung-chieh"],
    ["MATH-M", "211", "CALCULUS I", "Smith,Ann"],
    ["ECON-E", "201", "INTRO TO MICROECONOMICS", "Glomm,Gerhard"],
    ["ECON-E", "309", "TOPICS IN ECONOMICS", "Glomm,Gerhard"],
    ["ECON-E", "309", "TOPICS IN ECONOMICS", "Stone,John"],
  ].map((cells) => `"4258","FA25",${cells.map((c) => `"${c}"`).join(",")},"","20","10","5"`),
].join("\r\n");

/** @type {Record<string, [string, string]>} */
const ROUTES = {
  "/distribution/index.php": ["text/html", TERMS],
  "/distribution/export.php": ["text/csv", EXPORT],
};
const server = createServer((req, res) => {
  const [type, body] = ROUTES[new URL(req.url ?? "/", "http://x").pathname] ?? ["text/html", page];
  res.writeHead(200, { "Content-Type": type }).end(body);
});
await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
const siteUrl = `http://127.0.0.1:${/** @type {import("node:net").AddressInfo} */ (server.address()).port}/`;

const manifestPath = join(extDir, "manifest.json");
const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
for (const entry of [...manifest.content_scripts, ...manifest.web_accessible_resources]) {
  entry.matches.push("http://127.0.0.1/*");
}
manifest.host_permissions.push("http://127.0.0.1/*");
writeFileSync(manifestPath, JSON.stringify(manifest));

/** @param {string[]} path @param {string} from @param {string} to */
function patch(path, from, to) {
  const file = join(extDir, ...path);
  writeFileSync(file, readFileSync(file, "utf8").replace(from, to));
}
patch(["content", "hosts.js"], 'mode: "closed"', 'mode: "open"');
patch(["lib", "registrar.js"], "https://gradedistribution.registrar.indiana.edu", siteUrl.slice(0, -1));

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
  ws.send(
    JSON.stringify({
      id: 1,
      method: "Runtime.evaluate",
      params: { expression, returnByValue: true, awaitPromise: true },
    }),
  );
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
  let welcome;
  while (!(welcome = (await devtools("/json/list")).find((t) => t.url.endsWith("welcome/welcome.html")))) {
    await sleep(200);
  }
  const synced = await evaluate(
    welcome.webSocketDebuggerUrl,
    `import("../lib/registrar.js").then((m) => m.syncGrades(() => {}))`,
  );
  assert.equal(synced, true, "grades load from the registrar");

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

  const syllabusHref = await evaluate(
    tab.webSocketDebuggerUrl,
    `(async () => {
      const badge = document.querySelector('[data-iug-host="badge"][data-code="MATH-M 211"]');
      badge.shadowRoot.querySelector("button").click();
      await new Promise((r) => setTimeout(r, 500));
      const popover = document.querySelector('[data-iug-host="popover"]');
      return popover.shadowRoot.querySelector("a.syllabi")?.href ?? null;
    })()`,
  );
  assert.match(
    syllabusHref ?? "",
    /^https:\/\/syllabi\.iu\.edu\/\?keyword=MATH-M\+211&srcdb=4\d{3}$/,
    "grade card links to syllabi",
  );
  console.log("e2e passed");
} finally {
  browser.kill();
  server.close();
  await sleep(500);
  rmSync(workDir, { recursive: true, force: true, maxRetries: 5 });
}
