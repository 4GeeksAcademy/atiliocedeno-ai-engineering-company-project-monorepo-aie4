const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const appRoot = path.resolve(__dirname, "../../talent-pipeline-tracker");
const readAppFile = (relativePath) => fs.readFileSync(path.join(appRoot, relativePath), "utf8");
const analysis = readAppFile("app/backoffice/incidents/page.tsx");
const proxy = readAppFile("proxy.ts");

test("native Backoffice route renders the React workspace", () => {
  const page = readAppFile("app/backoffice/page.tsx");
  assert.match(page, /import BackofficeWorkspace from ["']\.\/workspace["']/);
  assert.match(page, /return <BackofficeWorkspace \/>/);
});

test("analysis and suppliers are destinations in the shared private navigation", () => {
  const navigation = readAppFile("app/components/private-navigation.tsx");
  for (const route of ["/talents", "/backoffice/incidents", "/backoffice/suppliers"]) {
    assert.ok(navigation.includes('"' + route + '"'));
  }
  assert.doesNotMatch(readAppFile("app/backoffice/workspace.tsx"), /type="file"/);
  assert.match(analysis, /type="file"/);
});

test("CSV analysis uses the same-origin API proxy and signed-in token", () => {
  assert.match(analysis, /localStorage\.getItem\("healthcore_access_token"\)/);
  assert.match(analysis, /fetch\(`\/api\/healthcore\/api\/incidents\/\$\{download \? "results\/export" : "analyze"\}`/);
  assert.match(analysis, /Authorization: `Bearer \$\{accessToken\}`/);
  assert.match(analysis, /method: download \? "GET" : "POST"/);
  assert.match(analysis, /data\.append\("file", file, "incident-upload\.csv"\)/);
});

test("file limits, aggregate reporting, and privacy-safe errors are present", () => {
  assert.match(analysis, /file\.size > 25_000_000/);
  assert.match(analysis, /setReport\(await response\.json\(\) as Report\)/);
  assert.match(analysis, /report\.invalid_breakdown\.by_rule/);
  assert.match(analysis, /Only aggregate results are stored/);
  assert.match(analysis, /catch \{/);
  assert.match(analysis, /Unable to reach the analysis service/);
  assert.doesNotMatch(analysis, /console\.(?:log|error)\(/);
});

test("export downloads aggregate results without resubmitting CSV", () => {
  assert.match(analysis, /method:\s*download\s*\?\s*"GET"\s*:\s*"POST"/);
  assert.match(analysis, /link\.download\s*=\s*"results\.csv"/);
  assert.match(analysis, /download\s*\|\|\s*!file/);
});

test("Backoffice and Talent Tracker routes are protected by cookie verification", () => {
  assert.match(proxy, /pathname === "\/backoffice"/);
  assert.match(proxy, /pathname\.startsWith\("\/backoffice\/"\)/);
  assert.match(proxy, /"\/backoffice", "\/backoffice\/:path\*"/);
  assert.match(proxy, /request\.cookies\.get\("healthcore_access_token"\)/);
  assert.match(proxy, /fetch\(`\$\{apiBaseUrl\}\/auth\/me`/);
  assert.match(proxy, /NextResponse\.redirect\(loginUrl\)/);
});
