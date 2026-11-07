const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const appRoot = path.resolve(__dirname, "../../talent-pipeline-tracker");
const readAppFile = (relativePath) => fs.readFileSync(path.join(appRoot, relativePath), "utf8");
const workspace = readAppFile("app/backoffice/workspace.tsx");
const proxy = readAppFile("proxy.ts");

test("native Backoffice route renders the React workspace", () => {
  const page = readAppFile("app/backoffice/page.tsx");
  assert.match(page, /import BackofficeWorkspace from ["']\.\/workspace["']/);
  assert.match(page, /return <BackofficeWorkspace \/>/);
});

test("sidebar entries lead to real pages or sections and track the current section", () => {
  assert.doesNotMatch(workspace, /(?:Overview|Resumen)<\/Link>/);
  assert.match(workspace, /href="#operations"/);
  assert.match(workspace, /<Link className="nav-link" href="\/talents">/);
  assert.match(workspace, /href="#compliance"/);
  assert.match(workspace, /href="#incident-analysis"/);
  for (const section of ["operations", "people", "compliance", "incident-analysis"]) {
    assert.match(workspace, new RegExp(`id="${section}"`));
  }
  assert.match(workspace, /addEventListener\("scroll", syncActiveSection/);
});

test("CSV analysis uses the same-origin API proxy and signed-in token", () => {
  assert.match(workspace, /localStorage\.getItem\("healthcore_access_token"\)/);
  assert.match(workspace, /fetch\(`\/api\/healthcore\/api\/incidents\/\$\{download \? "results\/export" : "analyze"\}`/);
  assert.match(workspace, /Authorization: `Bearer \$\{accessToken\}`/);
  assert.match(workspace, /method: download \? "GET" : "POST"/);
  assert.match(workspace, /data\.append\("file", file, "incident-upload\.csv"\)/);
});

test("file limits, aggregate reporting, and privacy-safe errors are present", () => {
  assert.match(workspace, /file\.size > 25_000_000/);
  assert.match(workspace, /setReport\(await response\.json\(\) as Report\)/);
  assert.match(workspace, /report\.invalid_breakdown\.by_rule/);
  assert.match(workspace, /Only aggregate results are stored/);
  assert.match(workspace, /catch \{/);
  assert.match(workspace, /Unable to reach the analysis service/);
  assert.doesNotMatch(workspace, /console\.(?:log|error)\(/);
});

test("export downloads aggregate results without resubmitting CSV", () => {
  assert.match(workspace, /method:\s*download\s*\?\s*"GET"\s*:\s*"POST"/);
  assert.match(workspace, /link\.download\s*=\s*"results\.csv"/);
  assert.match(workspace, /download\s*\|\|\s*!file/);
});

test("Backoffice and Talent Tracker routes are protected by cookie verification", () => {
  assert.match(proxy, /pathname === "\/backoffice"/);
  assert.match(proxy, /pathname\.startsWith\("\/backoffice\/"\)/);
  assert.match(proxy, /"\/backoffice", "\/backoffice\/:path\*"/);
  assert.match(proxy, /request\.cookies\.get\("healthcore_access_token"\)/);
  assert.match(proxy, /fetch\(`\$\{apiBaseUrl\}\/auth\/me`/);
  assert.match(proxy, /NextResponse\.redirect\(loginUrl\)/);
});
