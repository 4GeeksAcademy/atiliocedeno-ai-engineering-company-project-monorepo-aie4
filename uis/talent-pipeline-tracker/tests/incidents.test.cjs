const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const swc = require('next/dist/build/swc');
const { JSDOM } = require('jsdom');

const baseDom = new JSDOM('<html><body><div id="root"></div></body></html>', { url: 'http://localhost' });
Object.assign(global, {
  window: baseDom.window,
  document: baseDom.window.document,
  HTMLElement: baseDom.window.HTMLElement,
  Event: baseDom.window.Event,
  IS_REACT_ACT_ENVIRONMENT: true,
});
const React = require('react');
const { createRoot } = require('react-dom/client');
const { act } = React;

function loadComponent(dom, language, fetchImpl) {
  const file = 'app/backoffice/incidents/page.tsx';
  const source = swc.transformSync(fs.readFileSync(file, 'utf8'), {
    filename: file,
    jsc: { target: 'es2020', parser: { syntax: 'typescript', tsx: true }, transform: { react: { runtime: 'automatic' } } },
    module: { type: 'commonjs' },
  }).code;
  const module = { exports: {} };
  const mocks = {
    react: React,
    '../backoffice.css': {},
    '../../components/language-context': { useLanguage: () => ({ language }) },
  };
  vm.runInNewContext(source, {
    module,
    exports: module.exports,
    require: (name) => mocks[name] ?? require(name),
    console,
    window: dom.window,
    document: dom.window.document,
    fetch: fetchImpl,
    AbortController,
    URLSearchParams,
    FormData: dom.window.FormData,
    Intl,
    Number,
    Array,
    Object,
    String,
    Math,
  }, { filename: file });
  return module.exports.default;
}

async function mount(language, fetchImpl, token = "temporary-component-token") {
  baseDom.window.document.body.innerHTML = '<div id="root"></div>';
  baseDom.window.localStorage.setItem('healthcore_access_token', token);
  const Page = loadComponent(baseDom, language, fetchImpl);
  const root = createRoot(baseDom.window.document.querySelector('#root'));
  await act(async () => {
    root.render(React.createElement(Page));
    await Promise.resolve();
    await Promise.resolve();
  });
  return { dom: baseDom, root };
}

function change(dom, selector, value) {
  const element = dom.window.document.querySelector(selector);
  act(() => {
    const setter = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(element), 'value')?.set;
    setter?.call(element, value);
    element.dispatchEvent(new dom.window.Event('input', { bubbles: true }));
    element.dispatchEvent(new dom.window.Event('change', { bubbles: true }));
  });
}

function incident(index, overrides = {}) {
  return {
    id: `00000000-0000-4000-8000-${String(index).padStart(12, '0')}`,
    title: `Incident ${index}`,
    description: `Full description for incident ${index}`,
    category: 'patient_experience',
    status: index <= 28 ? 'open' : 'resolved',
    origin: 'customer',
    branch: 'austin_north',
    created_at: '2025-04-12T14:30:00Z',
    updated_at: '2025-04-13T15:45:00Z',
    ...overrides,
  };
}

function summary(overrides = {}) {
  return {
    total: 94,
    by_status: { open: 28, in_progress: 0, resolved: 52, discarded: 14 },
    by_category: { clinical_equipment: 0, it_system: 0, billing_error: 20, compliance_breach: 0, patient_experience: 61, staff_issue: 0, facility_issue: 0, referral_issue: 0, other: 13 },
    by_origin: { customer: 94, branch: 0, internal: 0 },
    by_branch: { central: 7, austin_north: 9, dallas_uptown: 0, houston_med_center: 4, san_antonio_west: 0, miami_brickell: 8, miami_doral: 0, orlando_east: 4, tampa_bay: 7, atlanta_midtown: 12, savannah: 10, london_city: 9, london_west: 9, manchester_central: 15 },
    ...overrides,
  };
}

async function wait(dom) {
  await act(async () => new Promise((resolve) => setTimeout(resolve, 15)));
}

test('incident detail shows the complete bilingual record and restores focus on close', async () => {
  const longDescription = `First paragraph with important detail.\n\n${'Additional context without truncation. '.repeat(35)}\nFinal line.`;
  const record = incident(7, { title: 'Equipment follow-up', description: longDescription });
  const requests = [];
  const { dom, root } = await mount('es', async (url) => {
    requests.push(url);
    return { ok: true, status: 200, json: async () => [record] };
  });
  await wait(dom);

  const trigger = dom.window.document.querySelector('.incident-detail-trigger');
  trigger.focus();
  act(() => trigger.click());
  const dialog = dom.window.document.querySelector('[role="dialog"]');
  assert.ok(dialog);
  assert.equal(dialog.getAttribute('aria-modal'), 'true');
  assert.equal(dom.window.document.activeElement.id, 'incident-detail-close');
  assert.match(dialog.textContent, /Descripción completa/);
  assert.equal(dialog.querySelector('#incident-detail-description').textContent, longDescription);
  assert.match(dialog.textContent, new RegExp(record.id));
  assert.match(dialog.textContent, /Experiencia del paciente/);
  assert.match(dialog.textContent, /Cliente/);
  assert.match(dialog.textContent, /Austin - North/);
  assert.match(dialog.textContent, /12 abr 2025/);
  assert.match(dialog.textContent, /13 abr 2025/);
  assert.equal(requests.length, 2, 'opening details should reuse the loaded list record');

  act(() => dom.window.document.querySelector('#incident-detail-close').click());
  assert.equal(dom.window.document.querySelector('[role="dialog"]'), null);
  assert.equal(dom.window.document.activeElement, trigger);
  assert.equal(dom.window.document.querySelectorAll('.incident-table tbody tr').length, 1);
  await act(async () => root.unmount());
});

test('incident row opens with keyboard and Escape closes without losing filters', async () => {
  const all = [incident(1, { status: 'open' }), incident(2, { status: 'resolved' })];
  const { dom, root } = await mount('en', async (url) => {
    const filtered = new URL(url, 'http://localhost').searchParams.get('status') === 'open';
    return { ok: true, status: 200, json: async () => filtered ? all.filter((item) => item.status === 'open') : all };
  });
  await wait(dom);
  change(dom, '#incident-filter-status', 'open');
  await wait(dom);
  const row = dom.window.document.querySelector('.incident-table tbody tr');
  row.focus();
  await act(async () => row.dispatchEvent(new dom.window.KeyboardEvent('keydown', { key: 'Enter', bubbles: true })));
  assert.ok(dom.window.document.querySelector('[role="dialog"]'));

  await act(async () => dom.window.document.dispatchEvent(new dom.window.KeyboardEvent('keydown', { key: 'Escape', bubbles: true })));
  assert.equal(dom.window.document.querySelector('[role="dialog"]'), null);
  assert.equal(dom.window.document.activeElement, row);
  assert.equal(dom.window.document.querySelector('#incident-filter-status').value, 'open');
  assert.equal(dom.window.document.querySelectorAll('.incident-table tbody tr').length, 1);
  await act(async () => root.unmount());
});

test('incident row status controls do not open the detail drawer', async () => {
  const record = incident(1, { status: 'open' });
  const { dom, root } = await mount('en', async (_url, options = {}) => options.method === 'PATCH'
    ? { ok: true, status: 200, json: async () => ({ ...record, status: 'in_progress' }) }
    : { ok: true, status: 200, json: async () => [record] });
  await wait(dom);

  const row = dom.window.document.querySelector('.incident-table tbody tr');
  change(dom, `#${row.querySelector('.incident-status-actions select').id}`, 'in_progress');
  assert.equal(dom.window.document.querySelector('[role="dialog"]'), null);
  await act(async () => row.querySelector('.incident-status-save').click());
  assert.equal(dom.window.document.querySelector('[role="dialog"]'), null);
  await act(async () => root.unmount());
});

test('incident detail drawer includes a full-screen mobile layout contract', () => {
  const css = fs.readFileSync('app/backoffice/backoffice.css', 'utf8');
  assert.match(css, /\.incident-detail-drawer\s*\{[^}]*width:min\(620px, 92vw\)/);
  assert.match(css, /@media\s*\(max-width:\s*620px\)\s*\{[\s\S]*?\.incident-detail-drawer\s*\{[^}]*width:100%/);
  assert.match(css, /\.incident-detail-content\s*\{[^}]*overflow-y:auto/);
});

test('incident directory follows 94 to 28 to 0 to 94 and clears filters', async () => {
  const all = Array.from({ length: 94 }, (_, index) => incident(index + 1));
  const requests = [];
  const { dom, root } = await mount('en', async (url, options = {}) => {
    requests.push({ url, authorization: options.headers?.Authorization });
    const query = new URL(url, 'http://localhost').searchParams;
    const status = query.get('status');
    const branch = query.get('branch');
    let data = all;
    if (status) data = data.filter((item) => item.status === status);
    if (branch) data = data.filter((item) => item.branch === branch);
    return { ok: true, status: 200, json: async () => data };
  });

  await wait(dom);
  assert.equal(dom.window.document.querySelectorAll('.incident-table tbody tr').length, 94);
  assert.equal(requests[0].authorization, 'Bearer temporary-component-token');

  change(dom, '#incident-filter-status', 'open');
  await wait(dom);
  assert.equal(dom.window.document.querySelectorAll('.incident-table tbody tr').length, 28);

  change(dom, '#incident-filter-status', 'in_progress');
  change(dom, '#incident-filter-branch', 'austin_north');
  await wait(dom);
  assert.equal(dom.window.document.querySelectorAll('.incident-table tbody tr').length, 0);
  assert.match(dom.window.document.querySelector('[role="status"]').textContent, /No incidents match/i);

  act(() => dom.window.document.querySelector('.incident-directory .incident-clear').click());
  await wait(dom);
  assert.equal(dom.window.document.querySelectorAll('.incident-table tbody tr').length, 94);
  assert.equal(dom.window.document.querySelector('#incident-filter-status').value, '');
  assert.equal(dom.window.document.querySelector('#incident-filter-branch').value, '');
  await act(async () => root.unmount());
});

test('retry preserves filters and recovers the filtered incident list', async () => {
  let branchAttempts = 0;
  const filtered = [incident(1, { status: 'open', branch: 'austin_north' })];
  const requests = [];
  const { dom, root } = await mount('en', async (url, options = {}) => {
    requests.push(url);
    if (url.includes('branch=austin_north')) {
      branchAttempts += 1;
      if (branchAttempts === 1) return { ok: false, status: 500, json: async () => ({ detail: 'failure' }) };
      return { ok: true, status: 200, json: async () => filtered };
    }
    if (url.includes('status=open')) return { ok: true, status: 200, json: async () => [filtered[0]] };
    return { ok: true, status: 200, json: async () => Array.from({ length: 94 }, (_, index) => incident(index + 1)) };
  });

  await wait(dom);
  change(dom, '#incident-filter-status', 'open');
  await wait(dom);
  change(dom, '#incident-filter-branch', 'austin_north');
  await wait(dom);

  assert.ok(dom.window.document.querySelector('[role="alert"]'));
  assert.equal(requests.at(-1).includes('status=open'), true);
  assert.equal(requests.at(-1).includes('branch=austin_north'), true);

  act(() => dom.window.document.querySelector('.incident-directory .incident-feedback-error button').click());
  await wait(dom);
  assert.equal(dom.window.document.querySelectorAll('.incident-table tbody tr').length, 1);
  assert.equal(dom.window.document.querySelector('#incident-filter-status').value, 'open');
  assert.equal(dom.window.document.querySelector('#incident-filter-branch').value, 'austin_north');
  assert.equal(requests.at(-1).includes('status=open'), true);
  assert.equal(requests.at(-1).includes('branch=austin_north'), true);
  await act(async () => root.unmount());
});

test('an older response cannot replace the latest filter selection', async () => {
  let resolveOpen;
  let resolveBranch;
  let call = 0;
  const openRow = incident(1, { status: 'open' });
  const branchRow = incident(2, { branch: 'austin_north', status: 'in_progress' });
  const { dom, root } = await mount('en', async (url) => {
    call += 1;
    if (call === 1) {
      return { ok: true, status: 200, json: () => new Promise((resolve) => { resolveOpen = resolve; }) };
    }
    if (url.includes('branch=austin_north')) {
      return new Promise((resolve) => { resolveBranch = () => resolve({ ok: true, status: 200, json: async () => [branchRow] }); });
    }
    if (url.includes('status=open')) {
      return { ok: true, status: 200, json: async () => [openRow] };
    }
    return { ok: true, status: 200, json: async () => [] };
  });

  await wait(dom);
  change(dom, '#incident-filter-status', 'open');
  await wait(dom);
  change(dom, '#incident-filter-branch', 'austin_north');
  await wait(dom);

  await act(async () => resolveBranch?.());
  await wait(dom);
  assert.equal(dom.window.document.querySelectorAll('.incident-table tbody tr').length, 1);

  await act(async () => resolveOpen?.([openRow]));
  await wait(dom);
  assert.equal(dom.window.document.querySelectorAll('.incident-table tbody tr').length, 1);
  assert.match(dom.window.document.querySelector('.incident-title-cell').textContent, /Incident 2/);
  await act(async () => root.unmount());
});

function fillIncident(dom) {
  change(dom, '#incident-create-title', 'Synthetic equipment issue');
  change(dom, '#incident-create-description', 'Device needs review');
  change(dom, '#incident-create-category', 'clinical_equipment');
  change(dom, '#incident-create-origin', 'internal');
}

function submitIncident(dom) {
  dom.window.document.querySelector('.incident-create-form').dispatchEvent(
    new dom.window.Event('submit', { bubbles: true, cancelable: true }),
  );
}

test('missing branch prevents POST and focuses the accessible error', async () => {
  let posts = 0;
  const { dom, root } = await mount('es', async (_url, options = {}) => {
    if (options.method === 'POST') posts += 1;
    return { ok: true, status: 200, json: async () => [] };
  });
  fillIncident(dom);
  await act(async () => submitIncident(dom));
  const branch = dom.window.document.querySelector('#incident-create-branch');
  assert.equal(posts, 0);
  assert.equal(dom.window.document.activeElement, branch);
  assert.equal(branch.getAttribute('aria-invalid'), 'true');
  assert.match(dom.window.document.getElementById(branch.getAttribute('aria-describedby')).textContent, /Selecciona una sede/);
  assert.equal(dom.window.document.querySelector('#incident-create-title').value, 'Synthetic equipment issue');
  assert.equal(dom.window.document.querySelector('#incident-create-description').value, 'Device needs review');
  await act(async () => root.unmount());
});

test('uncertain creation retains input and requires checking before resubmission', async () => {
  let posts = 0;
  let resolveSave;
  let failList = false;
  const urls = [];
  const { dom, root } = await mount('es', async (url, options = {}) => {
    if (options.method === 'POST') {
      posts += 1;
      assert.equal(options.headers.Authorization, 'Bearer temporary-component-token');
      if (posts === 1) throw new TypeError("Synthetic lost registration response");
      return new Promise((resolve) => { resolveSave = resolve; });
    }
    urls.push(url);
    return failList ? { ok: false, status: 500 } : { ok: true, status: 200, json: async () => [] };
  });
  change(dom, '#incident-filter-status', 'open');
  await wait(dom);
  fillIncident(dom);
  change(dom, '#incident-create-branch', 'central');
  await act(async () => submitIncident(dom));
  assert.match(dom.window.document.querySelector('.incident-create-error').textContent, /no pudo confirmar el alta/i);
  assert.equal(dom.window.document.querySelector('#incident-create-title').value, 'Synthetic equipment issue');
  assert.equal(dom.window.document.querySelector('#incident-create-description').value, 'Device needs review');
  await act(async () => { submitIncident(dom); submitIncident(dom); });
  assert.equal(posts, 1);
  await act(async () => dom.window.document.querySelector('.incident-create-error button').click());
  assert.equal(posts, 1);
  await act(async () => dom.window.document.querySelector('.incident-create-error button').click());
  await act(async () => { submitIncident(dom); submitIncident(dom); });
  assert.equal(posts, 2);
  assert.equal(dom.window.document.querySelector('.incident-create-form button').disabled, true);
  assert.match(dom.window.document.querySelector('.incident-create-form button').textContent, /Guardando/);
  failList = true;
  await act(async () => resolveSave({ ok: true, status: 201, json: async () => incident(95) }));
  await wait(dom);
  assert.equal(dom.window.document.querySelector('#incident-create-title').value, '');
  assert.equal(dom.window.document.querySelector('#incident-create-description').value, '');
  assert.match(dom.window.document.querySelector('.incident-create-success').textContent, /Incidencia registrada/);
  assert.ok(dom.window.document.querySelector('.incident-feedback-error'));
  assert.match(urls.at(-1), /status=open/);
  assert.equal(dom.window.document.querySelector('#incident-filter-status').value, 'open');
  await act(async () => root.unmount());
});

test('field errors from server are associated with the selected field', async () => {
  const { dom, root } = await mount('en', async (_url, options = {}) => options.method === 'POST'
    ? { ok: false, status: 400, json: async () => ({ detail: { field: 'branch', message: 'Select a valid branch.' } }) }
    : { ok: true, status: 200, json: async () => [] });
  fillIncident(dom);
  change(dom, '#incident-create-branch', 'central');
  await act(async () => submitIncident(dom));
  const branch = dom.window.document.querySelector('#incident-create-branch');
  assert.equal(dom.window.document.activeElement, branch);
  assert.match(dom.window.document.getElementById(branch.getAttribute('aria-describedby')).textContent, /Select a clinic/);
  assert.equal(dom.window.document.querySelector('#incident-create-title').value, 'Synthetic equipment issue');
  await act(async () => root.unmount());
});

test('successful creation refreshes the directory while retaining filters', async () => {
  let created = false;
  const requests = [];
  const { dom, root } = await mount('en', async (url, options = {}) => {
    requests.push({ url, method: options.method, body: options.body });
    if (options.method === 'POST') {
      created = true;
      return { ok: true, status: 201, json: async () => incident(95) };
    }
    return { ok: true, status: 200, json: async () => created ? [incident(95, { title: 'Synthetic equipment issue', branch: 'central' })] : [] };
  });
  change(dom, '#incident-filter-status', 'open');
  await wait(dom);
  fillIncident(dom);
  change(dom, '#incident-create-branch', 'central');
  await act(async () => submitIncident(dom));
  await wait(dom);
  assert.match(dom.window.document.querySelector('.incident-title-cell').textContent, /Synthetic equipment issue/);
  assert.match(dom.window.document.querySelector('.incident-create-success').textContent, /Incident registered/);
  assert.equal(dom.window.document.querySelector('#incident-filter-status').value, 'open');
  assert.match(requests.at(-1).url, /status=open/);
  const sent = JSON.parse(requests.find((request) => request.method === 'POST').body);
  assert.deepEqual(sent, { title: 'Synthetic equipment issue', description: 'Device needs review', category: 'clinical_equipment', origin: 'internal', branch: 'central' });
  await act(async () => root.unmount());
});

test('status update prevents double-click, confirms prior status and preserves the draft for retry', async () => {
  const original = incident(1, { status: 'open' });
  let patches = 0;
  let resolvePatch;
  let resolveRetry;
  const requests = [];
  const { dom, root } = await mount('es', async (url, options = {}) => {
    requests.push({ url, method: options.method, body: options.body });
    if (options.method === 'PATCH') {
      patches += 1;
      if (patches === 1) return new Promise((resolve) => { resolvePatch = () => resolve({ ok: false, status: 500, json: async () => ({ detail: "Write failed" }) }); });
      return new Promise((resolve) => {
        resolveRetry = () => resolve({ ok: true, status: 200, json: async () => ({ ...original, status: 'in_progress' }) });
      });
    }
    return { ok: true, status: 200, json: async () => url.endsWith(original.id) ? original : [original] };
  });
  await wait(dom);
  change(dom, '#incident-filter-status', 'open');
  await wait(dom);
  const row = dom.window.document.querySelector('.incident-table tbody tr');
  const selector = row.querySelector('.incident-status-actions select');
  const save = row.querySelector('.incident-status-save');
  change(dom, `#${selector.id}`, 'in_progress');
  await act(async () => { save.click(); save.click(); });
  assert.equal(patches, 1);
  assert.equal(save.disabled, true);
  assert.match(save.textContent, /Guardando/);
  await act(async () => resolvePatch());
  await wait(dom);

  assert.equal(selector.value, 'in_progress');
  assert.match(row.querySelector('.incident-status').textContent, /Abierta/);
  const alert = row.querySelector('[role="alert"]');
  assert.match(alert.textContent, /No se pudo cambiar el estado/);
  const retry = row.querySelector('.incident-status-retry');
  assert.match(retry.textContent, /Reintentar/);

  await act(async () => retry.click());
  const retryingSave = dom.window.document.querySelector('.incident-status-save');
  assert.equal(retryingSave.disabled, true);
  assert.match(retryingSave.textContent, /Guardando/);
  await act(async () => resolveRetry());
  await wait(dom);
  assert.equal(patches, 2);
  assert.equal(dom.window.document.querySelector('#incident-filter-status').value, 'open');
  assert.match(requests.filter((request) => request.method === 'PATCH')[1].url, /\/api\/healthcore\/api\/incidents\/.*\/status$/);
  assert.deepEqual(JSON.parse(requests.filter((request) => request.method === 'PATCH')[1].body), { status: 'in_progress' });
  assert.ok(requests.filter((request) => request.method !== 'PATCH').at(-1).url.includes('status=open'));
  await act(async () => root.unmount());
});

test('global incident summary loads totals and all bilingual breakdown groups', async () => {
  const requests = [];
  const { dom, root } = await mount('es', async (url, options = {}) => {
    requests.push({ url, authorization: options.headers?.Authorization });
    if (url.endsWith('/summary')) return { ok: true, status: 200, json: async () => summary() };
    return { ok: true, status: 200, json: async () => [] };
  });
  await wait(dom);

  const panel = dom.window.document.querySelector('.incident-summary');
  assert.match(panel.textContent, /Total de incidencias94/);
  assert.match(panel.textContent, /Distribución por estado/);
  assert.match(panel.textContent, /Abiertas28/);
  assert.match(panel.textContent, /En curso0/);
  assert.match(panel.textContent, /Resueltas52/);
  assert.match(panel.textContent, /Descartadas14/);
  assert.match(panel.textContent, /Distribución por categoría/);
  assert.match(panel.textContent, /Distribución por origen/);
  assert.match(panel.textContent, /Incidencias por sede/);
  const request = requests.find((item) => item.url.endsWith('/summary'));
  assert.equal(request.url, '/api/healthcore/api/incidents/summary');
  assert.equal(request.authorization, 'Bearer temporary-component-token');
  await act(async () => root.unmount());
});

test('summary error retries independently while directory and form remain usable', async () => {
  let summaryAttempts = 0;
  const { dom, root } = await mount('en', async (url) => {
    if (url.endsWith('/summary')) {
      summaryAttempts += 1;
      if (summaryAttempts === 1) return { ok: false, status: 500 };
      return { ok: true, status: 200, json: async () => summary() };
    }
    return { ok: true, status: 200, json: async () => [] };
  });
  await wait(dom);
  const panel = dom.window.document.querySelector('.incident-summary');
  assert.match(panel.querySelector('[role="alert"]').textContent, /couldn’t load the incident summary/i);
  assert.ok(dom.window.document.querySelector('.incident-directory'));
  assert.ok(dom.window.document.querySelector('.incident-create-form'));

  act(() => panel.querySelector('button').click());
  await wait(dom);
  assert.match(panel.textContent, /Total incidents94/);
  assert.equal(summaryAttempts, 2);
  await act(async () => root.unmount());
});

test('summary refreshes globally after a successful status change despite active list filters', async () => {
  let changed = false;
  const summaryUrls = [];
  const opened = incident(1, { status: 'open' });
  const { dom, root } = await mount('en', async (url, options = {}) => {
    if (url.endsWith('/summary')) {
      summaryUrls.push(url);
      return { ok: true, status: 200, json: async () => changed
        ? summary({ by_status: { open: 27, in_progress: 1, resolved: 52, discarded: 14 } })
        : summary() };
    }
    if (options.method === 'PATCH') {
      changed = true;
      return { ok: true, status: 200, json: async () => ({ ...opened, status: 'in_progress' }) };
    }
    const query = new URL(url, 'http://localhost').searchParams;
    return { ok: true, status: 200, json: async () => query.get('status') === 'open' ? [opened] : [opened] };
  });
  await wait(dom);
  change(dom, '#incident-filter-status', 'open');
  await wait(dom);
  const row = dom.window.document.querySelector('.incident-table tbody tr');
  change(dom, `#${row.querySelector('.incident-status-actions select').id}`, 'in_progress');
  await act(async () => row.querySelector('.incident-status-save').click());
  await wait(dom);

  const panel = dom.window.document.querySelector('.incident-summary');
  assert.match(panel.textContent, /Open27/);
  assert.match(panel.textContent, /In progress1/);
  assert.match(panel.textContent, /Total incidents94/);
  assert.equal(summaryUrls.length, 2);
  assert.ok(summaryUrls.every((url) => url === '/api/healthcore/api/incidents/summary'));
  assert.equal(dom.window.document.querySelector('#incident-filter-status').value, 'open');
  await act(async () => root.unmount());
});

test('CSV analysis distinguishes invalid response and invalid upload, then recovers', async () => {
  const replies = [
    new Response('<html>'),
    Response.json({ total_records: 1 }),
    Response.json({ detail: { code: 'invalid_upload' } }, { status: 422 }),
    Response.json({
      total_records: 1, valid_records: 1, invalid_records: 0, average_satisfaction: null,
      categories: {}, statuses: {}, countries: {}, satisfaction_distribution: {},
      closed_with_valid_satisfaction: 0, invalid_breakdown: { by_rule: {} },
    }),
  ];
  const { dom, root } = await mount('es', async url => url.endsWith('/summary')
    ? Response.json(summary()) : url.endsWith('/analyze') ? replies.shift() : Response.json([]));
  try {
    const input = dom.window.document.querySelector('#incident-file');
    Object.defineProperty(input, 'files', { value: [new dom.window.File(['fixture'], 'fixture.csv')] });
    await act(async () => input.dispatchEvent(new dom.window.Event('change', { bubbles: true })));
    for (const text of [/análisis inesperado/, /análisis inesperado/, /Vuelve a seleccionar/, /Análisis completado/]) {
      await act(async () => input.form.dispatchEvent(new dom.window.Event('submit', { bubbles: true, cancelable: true })));
      assert.match(dom.window.document.querySelector('.incident-results').textContent, text);
      assert.equal(input.form.querySelector('button').disabled, false);
    }
  } finally {
    await act(async () => root.unmount());
  }
});

test('an unconfirmed status offers a read-only check until the saved result can be confirmed', async () => {
  const original = incident(1, { status: 'open' });
  let patches = 0;
  let consultations = 0;
  let persisted = original;
  const { dom, root } = await mount('es', async (url, options = {}) => {
    if (options.method === 'PATCH') {
      patches++;
      persisted = { ...original, status: 'in_progress' };
      throw new TypeError('Synthetic network failure');
    }
    if (url.endsWith(original.id)) {
      if (++consultations === 1) return Response.json({}, { status: 502 });
      return Response.json(persisted);
    }
    return Response.json(url.endsWith('/summary') ? summary() : [persisted]);
  });
  try {
    const { document } = dom.window;
    change(dom, '#incident-status-' + original.id, 'in_progress');
    await act(async () => document.querySelector('.incident-status-save').click());
    assert.equal(patches, 1);
    assert.match(document.querySelector('.incident-status-error').textContent, /pendiente de confirmación/);
    assert.equal(document.querySelector('.incident-status-save').disabled, true);
    await act(async () => document.querySelector('.incident-status-retry').click());
    assert.equal(patches, 1);
    assert.equal(consultations, 2);
    assert.match(document.querySelector('.incident-table .incident-status').textContent, /En curso/);
    assert.match(document.querySelector('.incident-directory').textContent, /Estado actualizado/);
  } finally {
    await act(async () => root.unmount());
  }
});

test('incident save reconciles real proxy and FastAPI outcomes against reopened TinyDB',
  { skip: !process.env.HEALTHCORE_TEST_PYTHON, timeout: 30_000 }, async () => {
    const { spawn } = require('node:child_process');
    const { createInterface } = require('node:readline');
    const child = spawn(process.env.HEALTHCORE_TEST_PYTHON, ['tests/incident-api-fixture.py'], {
      stdio: ['pipe', 'pipe', 'inherit'], env: { ...process.env, PYTHONDONTWRITEBYTECODE: '1' },
    });
    const lines = createInterface({ input: child.stdout });
    const messages = lines[Symbol.asyncIterator]();
    let pipeline = Promise.resolve();
    const receive = async () => {
      const message = await messages.next();
      assert.equal(message.done, false, 'FastAPI fixture is running');
      return JSON.parse(message.value);
    };
    const send = command => {
      const result = pipeline.then(async () => {
        child.stdin.write(JSON.stringify(command) + '\n');
        return receive();
      });
      pipeline = result.catch(() => {});
      return result;
    };
    let root;
    try {
      const { token, records } = await receive();
      let mode = 'normal';
      let releasePatch;
      let holdPatch = false;
      const patchReplies = [];
      const patchRequests = [];
      const proxyFile = 'app/api/healthcore/[...path]/route.ts';
      const module = { exports: {} };
      const source = swc.transformSync(fs.readFileSync(proxyFile, 'utf8'), {
        filename: proxyFile, jsc: { parser: { syntax: 'typescript' } }, module: { type: 'commonjs' },
      }).code;
      vm.runInNewContext(source, {
        module, exports: module.exports, require, URL, Headers, Response, process: {env:{}},
        fetch: async (url, options) => {
          const patch = options.method === 'PATCH';
          if (patch && holdPatch) await new Promise(resolve => { releasePatch = resolve; });
          const target = new URL(url);
          const result = await send({
            mode: patch && mode !== 'lost' ? mode : 'normal',
            method: options.method, path: target.pathname + target.search,
            headers: Object.fromEntries(options.headers), body: Buffer.from(options.body ?? '').toString('utf8'),
          });
          if (patch && mode === 'lost') {
            assert.equal(result.status, 200);
            throw new TypeError('Synthetic transport failure after commit');
          }
          return new Response(result.body, { status: result.status, headers: result.headers });
        },
      }, { filename: proxyFile });
      const routes = module.exports;
      const mounted = await mount('es', async (url, options) => {
        const request = new Request(new URL(url, 'http://localhost'), options);
        const segments = new URL(request.url).pathname.split('/').slice(3);
        if (request.method === 'PATCH') patchRequests.push(url);
        const response = await routes[request.method](request, { params: Promise.resolve({ path: segments }) });
        if (request.method === 'PATCH') patchReplies.push(response.status);
        return response;
      }, token);
      root = mounted.root;
      const { dom } = mounted;
      const { document } = dom.window;
      const rows = () => [...document.querySelectorAll('.incident-table tbody tr')];
      const row = record => rows().find(item => item.textContent.includes(record.title));
      const read = record => send({ mode: 'read', id: record.id });
      const choose = record => change(dom, '#incident-status-' + record.id, 'in_progress');
      const save = record => act(async () => row(record).querySelector('.incident-status-save').click());
      async function until(check) {
        for (let count = 0; count < 80 && !check(); count++) await wait(dom);
        assert.ok(check(), 'Expected incident state became visible');
      }
      await until(() => rows().length === 4);
      change(dom, '#incident-filter-origin', 'internal');
      await until(() => rows().length === 4);
      const [success, rejected, failed, uncertain] = records;

      choose(success);
      holdPatch = true;
      await save(success);
      assert.match(row(success).textContent, /Guardando/);
      assert.equal(row(success).querySelector('.incident-status-save').disabled, true);
      await save(success);
      assert.equal(patchRequests.length, 1);
      holdPatch = false;
      await act(async () => releasePatch());
      await until(() => row(success)?.querySelector('.incident-status').textContent === 'En curso');
      const confirmed = await read(success);
      assert.equal(confirmed.id, success.id);
      assert.equal(confirmed.created_at, success.created_at);
      assert.ok(confirmed.updated_at > success.updated_at);
      assert.equal(confirmed.status, 'in_progress');
      assert.equal(patchReplies.at(-1), 200);

      await send({
        mode: 'normal', method: 'PATCH', path: '/api/incidents/' + rejected.id + '/status',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
        body: '{"status":"discarded"}',
      });
      const discarded = await read(rejected);
      choose(rejected);
      await save(rejected);
      await until(() => row(rejected)?.querySelector('.incident-status').textContent === 'Descartada');
      assert.equal(patchReplies.at(-1), 400);
      assert.deepEqual(await read(rejected), discarded);
      assert.equal(row(rejected).querySelector('.incident-status-retry'), null);
      assert.match(document.querySelector('.incident-directory').textContent, /transición fue rechazada/);

      mode = 'prewrite';
      choose(failed);
      await save(failed);
      await until(() => row(failed)?.querySelector('.incident-status-retry'));
      assert.equal(patchReplies.at(-1), 500);
      assert.deepEqual(await read(failed), failed);
      assert.equal(row(failed).querySelector('select').value, 'in_progress');
      mode = 'normal';
      await act(async () => row(failed).querySelector('.incident-status-retry').click());
      await until(() => row(failed)?.querySelector('.incident-status').textContent === 'En curso');
      assert.equal((await read(failed)).status, 'in_progress');

      mode = 'lost';
      choose(uncertain);
      await save(uncertain);
      await until(() => row(uncertain)?.querySelector('.incident-status').textContent === 'En curso');
      assert.equal(patchReplies.at(-1), 502);
      assert.equal((await read(uncertain)).status, 'in_progress');
      assert.equal(row(uncertain).querySelector('.incident-status-retry'), null);

      mode = 'postwrite';
      change(dom, '#incident-status-' + uncertain.id, 'resolved');
      await save(uncertain);
      await until(() => row(uncertain)?.querySelector('.incident-status').textContent === 'Resuelta');
      assert.equal(patchReplies.at(-1), 500);
      assert.equal((await read(uncertain)).status, 'resolved');
      assert.equal(document.querySelector('#incident-filter-origin').value, 'internal');
      await until(() => /Resueltas1/.test(document.querySelector('.incident-summary').textContent));
    } finally {
      if (root) await act(async () => root.unmount());
      child.stdin.end();
      lines.close();
      if (child.exitCode === null) await new Promise(resolve => child.once('close', resolve));
    }
  });
