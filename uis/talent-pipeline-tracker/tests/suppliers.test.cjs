const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const swc = require('next/dist/build/swc');
const { JSDOM } = require('jsdom');
const bootstrapDom = new JSDOM('<html><body><div id="root"></div></body></html>', { url: 'http://localhost' });
Object.assign(global, {
  window: bootstrapDom.window,
  document: bootstrapDom.window.document,
  HTMLElement: bootstrapDom.window.HTMLElement,
  Event: bootstrapDom.window.Event,
  IS_REACT_ACT_ENVIRONMENT: true,
});
const React = require('react');
const { createRoot } = require('react-dom/client');
const { act } = React;

function loadComponent(dom, language, fetchImpl) {
  const file = 'app/backoffice/suppliers/suppliers-directory.tsx';
  const source = swc.transformSync(fs.readFileSync(file, 'utf8'), {
    filename: file,
    jsc: {
      target: 'es2020',
      parser: { syntax: 'typescript', tsx: true },
      transform: { react: { runtime: 'automatic' } },
    },
    module: { type: 'commonjs' },
  }).code;
  const module = { exports: {} };
  const mocks = {
    react: React,
    '../backoffice.css': {},
    './suppliers.css': {},
    'next/link': ({ children, href, ...props }) => React.createElement('a', { href, ...props }, children),
    '../../components/brand-logo': { __esModule: true, default: () => React.createElement('span') },
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
    Intl,
    Number,
    Array,
    Object,
    String,
    Math,
  }, { filename: file });
  return module.exports.default;
}

async function mount(language, fetchImpl) {
  const dom = bootstrapDom;
  dom.window.document.body.innerHTML = '<div id="root"></div>';
  dom.window.localStorage.setItem('healthcore_access_token', 'temporary-component-token');
  global.IS_REACT_ACT_ENVIRONMENT = true;
  const Page = loadComponent(dom, language, fetchImpl);
  const root = createRoot(dom.window.document.querySelector('#root'));
  await act(async () => {
    root.render(React.createElement(Page));
    await Promise.resolve();
    await Promise.resolve();
  });
  return { dom, root };
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

function fillRequiredFields(dom) {
  openCreateForm(dom);
  change(dom, '#supplier-create-name', 'New Test Supplier');
  change(dom, '#supplier-create-country', 'USA');
  change(dom, '#supplier-create-rate', '1234.5');
  const category = dom.window.document.querySelector('input[name="categories"][value="medical_supplies"]');
  act(() => {
    category.click();
  });
}

function openCreateForm(dom) {
  const button = dom.window.document.querySelector('.supplier-add-button');
  if (button.getAttribute('aria-expanded') === 'true') return;
  act(() => button.click());
}

async function submit(dom) {
  await act(async () => {
    dom.window.document.querySelector('.supplier-create-form').dispatchEvent(
      new dom.window.Event('submit', { bubbles: true, cancelable: true }),
    );
    await new Promise((resolve) => setTimeout(resolve, 10));
  });
}

test('supplier creation validates required fields in English without posting', async () => {
  let posts = 0;
  const { dom, root } = await mount('en', async (url, options = {}) => {
    if (options.method === 'POST') posts += 1;
    return { ok: true, status: 200, json: async () => [] };
  });
  openCreateForm(dom);
  await submit(dom);
  assert.match(dom.window.document.querySelector('[role="alert"]').textContent, /supplier name/i);
  assert.equal(dom.window.document.querySelector('#supplier-create-name').getAttribute('aria-invalid'), 'true');
  assert.equal(posts, 0);
  await act(async () => root.unmount());
  dom.window.close();
});

test('supplier creation posts only selected/filled fields and refreshes the list', async () => {
  const initial = Array.from({ length: 15 }, (_, index) => ({
    id: index + 1,
    name: `Seed Supplier ${index + 1}`,
    country: 'USA',
    categories: ['medical_supplies'],
    monthly_rate: 100 + index,
    currency: 'USD',
    compliance_agreement: null,
    status: 'active',
    updated_at: '2026-01-01T00:00:00Z',
  }));
  const created = {
    id: 16,
    name: 'New Test Supplier',
    country: 'USA',
    categories: ['medical_supplies'],
    monthly_rate: 1234.5,
    currency: 'USD',
    compliance_agreement: null,
    status: 'active',
    updated_at: '2026-01-01T00:00:00Z',
  };
  let getCount = 0;
  let createdFlag = false;
  let postedPayload;
  let lastListUrl = '';
  const { dom, root } = await mount('en', async (url, options = {}) => {
    if (options.method === 'POST') {
      postedPayload = JSON.parse(options.body);
      createdFlag = true;
      return { ok: true, status: 201, json: async () => created };
    }
    getCount += 1;
    lastListUrl = url;
    return { ok: true, status: 200, json: async () => createdFlag ? [...initial, created] : initial };
  });
  change(dom, '.supplier-filters label:first-child select', 'USA');
  change(dom, '.supplier-filters label:nth-child(2) select', 'medical_supplies');
  await act(async () => new Promise((resolve) => setTimeout(resolve, 15)));
  const countBeforeCreate = getCount;
  fillRequiredFields(dom);
  assert.equal(dom.window.document.querySelector('#supplier-create-country').value, 'USA');
  assert.equal(dom.window.document.querySelector('.supplier-currency').textContent, 'USD');
  await submit(dom);
  assert.ok(getCount > countBeforeCreate);
  assert.match(lastListUrl, /country=USA/);
  assert.match(lastListUrl, /category=medical_supplies/);
  assert.equal(dom.window.document.querySelectorAll('tbody .supplier-name').length, 16);
  assert.equal([...dom.window.document.querySelectorAll('tbody .supplier-name')].filter((el) => el.textContent === 'New Test Supplier').length, 1);
  assert.match(dom.window.document.querySelector('[role="status"]').textContent, /added successfully/i);
  assert.equal(dom.window.document.querySelector('#supplier-create-name'), null);
  assert.equal(dom.window.document.querySelector('.supplier-add-button').getAttribute('aria-expanded'), 'false');
  assert.equal(dom.window.document.querySelector('.supplier-filters label:first-child select').value, 'USA');
  assert.equal(dom.window.document.querySelector('.supplier-filters label:nth-child(2) select').value, 'medical_supplies');
  assert.deepEqual(postedPayload, {
    name: 'New Test Supplier',
    country: 'USA',
    categories: ['medical_supplies'],
    monthly_rate: 1234.5,
    currency: 'USD',
    status: 'active',
  });
  assert.equal('id' in postedPayload, false);
  assert.equal('updated_at' in postedPayload, false);
  assert.equal('contact_email' in postedPayload, false);
  await act(async () => root.unmount());
  dom.window.close();
});

test('supplier creation maps a server 422 field and retains the entered values', async () => {
  const { dom, root } = await mount('en', async (_url, options = {}) => {
    if (options.method === 'POST') {
      return {
        ok: false,
        status: 422,
        json: async () => ({ detail: [{ loc: ['body', 'contact_email'], msg: 'value is not a valid email address' }] }),
      };
    }
    return { ok: true, status: 200, json: async () => [] };
  });
  fillRequiredFields(dom);
  change(dom, '#supplier-create-email', 'test@example.test');
  await submit(dom);
  assert.match(dom.window.document.querySelector('[role="alert"]').textContent, /contact email field/i);
  assert.equal(dom.window.document.querySelector('#supplier-create-email').value, 'test@example.test');
  assert.equal(dom.window.document.querySelector('#supplier-create-email').getAttribute('aria-invalid'), 'true');
  await act(async () => root.unmount());
  dom.window.close();
});

test('supplier directory is primary and create form opens and cancels on demand', async () => {
  const { dom, root } = await mount('es', async () => ({ ok: true, status: 200, json: async () => [] }));
  const directory = dom.window.document.querySelector('#supplier-list-title').closest('section');
  assert.ok(directory);
  assert.equal(dom.window.document.querySelector('#supplier-create-panel'), null);
  assert.equal(dom.window.document.querySelector('.supplier-add-button').getAttribute('aria-expanded'), 'false');
  openCreateForm(dom);
  assert.ok(dom.window.document.querySelector('#supplier-create-panel'));
  change(dom, '#supplier-create-name', 'Draft proveedor');
  click(dom, '.supplier-cancel-create');
  assert.equal(dom.window.document.querySelector('#supplier-create-panel'), null);
  assert.equal(dom.window.document.querySelector('.supplier-add-button').getAttribute('aria-expanded'), 'false');
  openCreateForm(dom);
  assert.equal(dom.window.document.querySelector('#supplier-create-name').value, '');
  await act(async () => root.unmount());
  dom.window.close();
});

test('supplier country changes the read-only currency and labels target their controls', async () => {
  const { dom, root } = await mount('es', async () => ({ ok: true, status: 200, json: async () => [] }));
  openCreateForm(dom);
  const currency = dom.window.document.querySelector('.supplier-currency');
  assert.equal(currency.textContent, 'Se completa al elegir el país');
  assert.equal(currency.tagName, 'OUTPUT');
  change(dom, '#supplier-create-country', 'USA');
  assert.equal(currency.textContent, 'USD');
  change(dom, '#supplier-create-country', 'UK');
  assert.equal(currency.textContent, 'GBP');
  for (const id of ['name', 'country', 'rate', 'status', 'agreement', 'renewal', 'email', 'notes']) {
    const control = dom.window.document.querySelector(`#supplier-create-${id}`);
    assert.ok(dom.window.document.querySelector(`label[for="${control.id}"]`), `expected an associated label for ${control.id}`);
  }
  const categories = dom.window.document.querySelector('.supplier-category-fieldset');
  assert.equal(categories.parentElement, dom.window.document.querySelector('.supplier-form-grid'));
  await act(async () => root.unmount());
  dom.window.close();
});

function supplierRecord(overrides = {}) {
  return {
    id: 42,
    name: 'Twilio',
    country: 'USA',
    categories: ['medical_supplies'],
    monthly_rate: 680,
    currency: 'USD',
    compliance_agreement: null,
    status: 'active',
    updated_at: '2026-11-16T12:00:00Z',
    ...overrides,
  };
}

function click(dom, selector) {
  act(() => dom.window.document.querySelector(selector).click());
}

test('rate editing cancels and validates locally, then PATCHes and updates the filtered row', async () => {
  const twilio = supplierRecord();
  let patchCount = 0;
  let patchUrl;
  let patchOptions;
  let listUrl;
  const { dom, root } = await mount('en', async (url, options = {}) => {
    if (options.method === 'PATCH') {
      patchCount += 1;
      patchUrl = url;
      patchOptions = options;
      return { ok: true, status: 200, json: async () => supplierRecord({ monthly_rate: 750, updated_at: '2026-11-16T13:00:00Z' }) };
    }
    listUrl = url;
    return { ok: true, status: 200, json: async () => [twilio] };
  });
  change(dom, '.supplier-filters label:first-child select', 'USA');
  change(dom, '.supplier-filters label:nth-child(2) select', 'medical_supplies');
  await act(async () => new Promise((resolve) => setTimeout(resolve, 15)));
  assert.match(listUrl, /country=USA/);
  assert.match(listUrl, /category=medical_supplies/);
  assert.match(dom.window.document.querySelector('[data-testid="supplier-rate-42"]').textContent, /680/);

  click(dom, '.supplier-edit-rate');
  assert.equal(dom.window.document.querySelector('[data-testid="supplier-rate-input-42"]').value, '680');
  click(dom, '.supplier-rate-buttons button:nth-child(2)');
  assert.equal(dom.window.document.querySelector('[data-testid="supplier-rate-input-42"]'), null);
  assert.equal(patchCount, 0);

  click(dom, '.supplier-edit-rate');
  change(dom, '[data-testid="supplier-rate-input-42"]', '0');
  click(dom, '.supplier-rate-buttons button:first-child');
  assert.equal(patchCount, 0);
  assert.match(dom.window.document.querySelector('[role="alert"]').textContent, /greater than zero/i);
  assert.match(dom.window.document.querySelector('[data-testid="supplier-rate-42"]').textContent, /680/);

  change(dom, '[data-testid="supplier-rate-input-42"]', '750');
  click(dom, '.supplier-rate-buttons button:first-child');
  await act(async () => new Promise((resolve) => setTimeout(resolve, 15)));
  assert.equal(patchCount, 1);
  assert.equal(patchUrl, '/api/healthcore/suppliers/42/rate');
  assert.deepEqual(JSON.parse(patchOptions.body), { monthly_rate: 750 });
  assert.equal(patchOptions.headers.Authorization, 'Bearer temporary-component-token');
  assert.match(dom.window.document.querySelector('[data-testid="supplier-rate-42"]').textContent, /750/);
  assert.equal(dom.window.document.querySelector('[data-testid="supplier-rate-input-42"]'), null);
  assert.equal(dom.window.document.querySelector('.supplier-filters label:first-child select').value, 'USA');
  assert.equal(dom.window.document.querySelector('.supplier-filters label:nth-child(2) select').value, 'medical_supplies');
  await act(async () => root.unmount());
  dom.window.close();
});

test('rate editing retains the confirmed rate and draft after a server 422', async () => {
  const { dom, root } = await mount('es', async (_url, options = {}) => {
    if (options.method === 'PATCH') {
      return { ok: false, status: 422, json: async () => ({ detail: [{ loc: ['body', 'monthly_rate'], msg: 'greater_than' }] }) };
    }
    return { ok: true, status: 200, json: async () => [supplierRecord()] };
  });
  await act(async () => new Promise((resolve) => setTimeout(resolve, 10)));
  click(dom, '.supplier-edit-rate');
  change(dom, '[data-testid="supplier-rate-input-42"]', '0');
  change(dom, '[data-testid="supplier-rate-input-42"]', '0.5');
  click(dom, '.supplier-rate-buttons button:first-child');
  await act(async () => new Promise((resolve) => setTimeout(resolve, 15)));
  assert.match(dom.window.document.querySelector('[role="alert"]').textContent, /servidor rechazó/i);
  assert.equal(dom.window.document.querySelector('[data-testid="supplier-rate-input-42"]').value, '0.5');
  assert.match(dom.window.document.querySelector('[data-testid="supplier-rate-42"]').textContent, /680/);
  await act(async () => root.unmount());
  dom.window.close();
});

test('status toggle preserves the category filter and updates the row action from API responses', async () => {
  const healthstream = supplierRecord({
    id: 14,
    name: 'Healthstream LMS',
    categories: ['training_platforms'],
    monthly_rate: 1100,
    status: 'suspended',
  });
  let status = 'suspended';
  const patchBodies = [];
  const { dom, root } = await mount('en', async (url, options = {}) => {
    if (options.method === 'PATCH') {
      const body = JSON.parse(options.body);
      patchBodies.push(body);
      status = body.status;
      return { ok: true, status: 200, json: async () => ({ ...healthstream, status }) };
    }
    return { ok: true, status: 200, json: async () => [{ ...healthstream, status }] };
  });
  change(dom, '.supplier-filters label:nth-child(2) select', 'training_platforms');
  await act(async () => new Promise((resolve) => setTimeout(resolve, 15)));
  assert.equal(dom.window.document.querySelectorAll('tbody tr').length, 1);
  assert.equal(dom.window.document.querySelector('.supplier-name').textContent, 'Healthstream LMS');
  assert.match(dom.window.document.querySelector('[data-testid="supplier-status-14"]').textContent, /suspended/i);
  assert.equal(dom.window.document.querySelector('[data-testid="supplier-status-action-14"]').textContent, 'Activate');

  click(dom, '[data-testid="supplier-status-action-14"]');
  await act(async () => new Promise((resolve) => setTimeout(resolve, 15)));
  assert.deepEqual(patchBodies[0], { status: 'active' });
  assert.match(dom.window.document.querySelector('[data-testid="supplier-status-14"]').textContent, /active/i);
  assert.equal(dom.window.document.querySelector('[data-testid="supplier-status-action-14"]').textContent, 'Suspend');
  assert.equal(dom.window.document.querySelector('.supplier-filters label:nth-child(2) select').value, 'training_platforms');
  assert.equal(dom.window.document.querySelector('.supplier-name').textContent, 'Healthstream LMS');

  click(dom, '[data-testid="supplier-status-action-14"]');
  await act(async () => new Promise((resolve) => setTimeout(resolve, 15)));
  assert.deepEqual(patchBodies[1], { status: 'suspended' });
  assert.match(dom.window.document.querySelector('[data-testid="supplier-status-14"]').textContent, /suspended/i);
  assert.equal(dom.window.document.querySelector('[data-testid="supplier-status-action-14"]').textContent, 'Activate');
  assert.equal(dom.window.document.querySelector('.supplier-filters label:nth-child(2) select').value, 'training_platforms');
  await act(async () => root.unmount());
  dom.window.close();
});

test('status update failure retains the confirmed status, displays localized error, and permits retry', async () => {
  let patchCount = 0;
  const healthstream = supplierRecord({
    id: 14,
    name: 'Healthstream LMS',
    categories: ['training_platforms'],
    monthly_rate: 1100,
    status: 'suspended',
  });
  const { dom, root } = await mount('es', async (_url, options = {}) => {
    if (options.method === 'PATCH') {
      patchCount += 1;
      return patchCount === 1
        ? { ok: false, status: 500, json: async () => ({ detail: 'failure' }) }
        : { ok: true, status: 200, json: async () => ({ ...healthstream, status: 'active' }) };
    }
    return { ok: true, status: 200, json: async () => [healthstream] };
  });
  change(dom, '.supplier-filters label:nth-child(2) select', 'training_platforms');
  await act(async () => new Promise((resolve) => setTimeout(resolve, 15)));
  click(dom, '[data-testid="supplier-status-action-14"]');
  await act(async () => new Promise((resolve) => setTimeout(resolve, 15)));
  assert.match(dom.window.document.querySelector('[role="alert"]').textContent, /no se pudo actualizar/i);
  assert.match(dom.window.document.querySelector('[data-testid="supplier-status-14"]').textContent, /suspendido/i);
  assert.equal(dom.window.document.querySelector('[data-testid="supplier-status-action-14"]').textContent, 'Activar');
  assert.equal(dom.window.document.querySelector('.supplier-filters label:nth-child(2) select').value, 'training_platforms');
  click(dom, '[data-testid="supplier-status-action-14"]');
  await act(async () => new Promise((resolve) => setTimeout(resolve, 15)));
  assert.equal(patchCount, 2);
  assert.match(dom.window.document.querySelector('[data-testid="supplier-status-14"]').textContent, /activo/i);
  assert.equal(dom.window.document.querySelector('[data-testid="supplier-status-action-14"]').textContent, 'Suspender');
  await act(async () => root.unmount());
  dom.window.close();
});

test('supplier GET rejects null categories and recovers to a real empty list', async () => {
  const supplier = {
    id: 1, name: 'Fixture', country: 'USA', currency: 'USD',
    categories: null, monthly_rate: 100, status: 'active', updated_at: '2026-01-01T00:00:00Z',
  };
  let loads = 0;
  const { dom, root } = await mount('en', async () => Response.json(++loads === 1 ? [supplier] : []));
  try {
    const error = dom.window.document.querySelector('[role=alert]');
    assert.match(error.textContent, /unable to load suppliers/i);
    assert.doesNotMatch(dom.window.document.body.textContent, /No suppliers match/);
    await act(async () => error.querySelector('button').click());
    assert.match(dom.window.document.body.textContent, /No suppliers match/);
    assert.equal(dom.window.document.querySelector('[role=alert]'), null);
  } finally {
    await act(async () => root.unmount());
  }
});

test('an older rate PATCH response preserves the independently confirmed status', async () => {
  const supplier = {
    id: 1, name: 'Fixture', country: 'USA', currency: 'USD', categories: ['medical_supplies'],
    monthly_rate: 100, status: 'active', updated_at: '2026-01-01T00:00:00Z',
  };
  let finishRate;
  const { dom, root } = await mount('en', async (url, init) => {
    if (init.method !== 'PATCH') return Response.json([supplier]);
    if (url.endsWith('/rate')) return new Promise(resolve => {
      finishRate = () => resolve(Response.json({ ...supplier, monthly_rate: 125 }));
    });
    return Response.json({ ...supplier, monthly_rate: 125, status: 'suspended' });
  });
  try {
    const { document } = dom.window;
    await act(async () => document.querySelector('.supplier-edit-rate').click());
    change(dom, '#supplier-rate-edit-1', '125');
    await act(async () => document.querySelector('.supplier-rate-buttons .button-primary').click());
    await act(async () => document.querySelector('.supplier-toggle-status').click());
    assert.match(document.querySelector('[data-testid=supplier-status-1]').textContent, /Suspended/);
    await act(async () => finishRate());
    assert.match(document.querySelector('[data-testid=supplier-status-1]').textContent, /Suspended/);
    assert.match(document.querySelector('[data-testid=supplier-rate-1]').textContent, /125/);
  } finally {
    await act(async () => root.unmount());
  }
});
