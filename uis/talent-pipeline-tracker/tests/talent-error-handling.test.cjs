const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const swc = require('next/dist/build/swc');
const { JSDOM } = require('jsdom');

const dom = new JSDOM('<div id="root"></div>', { url: 'http://localhost/talents/en' });
Object.assign(global, { window: dom.window, document: dom.window.document, HTMLElement: dom.window.HTMLElement, Event: dom.window.Event, IS_REACT_ACT_ENVIRONMENT: true });
const React = require('react');
const { act } = React;
const { createRoot } = require('react-dom/client');
const router = { replace() {}, push() {} };

function load(file, globals = {}, mocks = {}) {
  const module = { exports: {} };
  const code = swc.transformSync(fs.readFileSync(file, 'utf8'), {
    filename: file, jsc: { parser: { syntax: 'typescript', tsx: file.endsWith('tsx') }, transform: { react: { runtime: 'automatic' } } },
    module: { type: 'commonjs' },
  }).code;
  vm.runInNewContext(code, {
    module, exports: module.exports, window, document, Error, DOMException, AbortController, URLSearchParams,
    require: name => mocks[name] ?? require(name), ...globals,
  }, { filename: file });
  return module.exports;
}

function mount(file, fetch) {
  document.body.innerHTML = '<div id="root"></div>';
  const tracker = load('app/talents/api-url.ts', { process: { env: { NEXT_PUBLIC_API_URL: 'https://fixture.invalid' } }, fetch });
  const labels = load('app/talents/labels.ts');
  const language = { useLanguage: () => ({ language: 'en' }) };
  const Page = load(file, {}, {
    'next/link': ({ children, ...props }) => React.createElement('a', props, children),
    'next/navigation': { useRouter: () => router, usePathname: () => '/talents/en', useSearchParams: () => new URLSearchParams('status=received') },
    'lucide-react': { Plus: () => null, ArrowLeft: () => null },
    './api-url': tracker, '../api-url': tracker,
    './labels': labels, '../labels': labels,
    './pipeline.module.css': {}, '../pipeline.module.css': {},
    '../components/language-context': language, '../../components/language-context': language,
    '../talent-pipeline': { invalidateRecordsCache() {} },
  }).default;
  const root = createRoot(document.querySelector('#root'));
  return { root, render: () => act(async () => root.render(React.createElement(Page, { id: 'fixture-id' }))) };
}

test('talent list shows recoverable translated failures for HTTP, network and invalid payloads', async () => {
  const replies = [
    () => Response.json({ error: 'private fixture data' }, { status: 502 }),
    () => { throw new TypeError('private fixture data'); },
    () => new Response('<html>private fixture data</html>'),
    () => Response.json({ unrelated: [] }),
    () => Response.json({ records: [] }),
  ];
  const { root, render } = mount('app/talents/talent-pipeline.tsx', async () => replies.shift()());
  try {
    await render();
    const expected = [/temporarily unavailable/, /check your connection/i, /unexpected response/, /unexpected response/];
    for (const text of expected) {
      const alert = document.querySelector('[role=alert]');
      assert.match(alert.textContent, text);
      assert.doesNotMatch(alert.textContent, /private fixture data|502/);
      assert.doesNotMatch(document.body.textContent, /No talents match/);
      await act(async () => alert.querySelector('button').click());
    }
    assert.equal(document.querySelector('[role=alert]'), null);
    assert.match(document.body.textContent, /No talents match/);
    assert.equal(document.querySelectorAll('select')[0].value, 'received');
  } finally {
    await act(async () => root.unmount());
  }
});

test('candidate detail survives failed notes and confirms a saved note before reloading', async () => {
  let noteReads = 0;
  let notePosts = 0;
  let recordReads = 0;
  const { root, render } = mount('app/talents/[id]/talent-detail.tsx', async (url, request) => {
    if (!url.endsWith('/notes')) {
      recordReads++;
      return Response.json({ data: { _id: 'fixture-id', fullName: 'Fixture Candidate' } });
    }
    if (request?.method === 'POST') {
      notePosts++;
      assert.deepEqual(JSON.parse(request.body), { content: 'New fixture note' });
      return new Response(null, { status: 204 });
    }
    if (++noteReads < 3) return Response.json({}, { status: 502 });
    return Response.json({ data: [{ note_id: 'fixture-note', text: 'New fixture note' }] });
  });
  try {
    await render();
    assert.match(document.querySelector('h1').textContent, /Fixture Candidate/);
    assert.match(document.querySelector('[role=alert]').textContent, /Reload notes/);
    assert.doesNotMatch(document.body.textContent, /There are no notes/);
    const input = document.querySelector('textarea');
    await act(async () => {
      input.focus();
      Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value').set.call(input, 'New fixture note');
      input.dispatchEvent(new window.Event('input', { bubbles: true }));
      input.dispatchEvent(new window.Event('change', { bubbles: true }));
    });
    assert.equal(input.form.querySelector('button').disabled, false, 'typing enables note submit');
    await act(async () => input.form.querySelector('button').click());
    assert.equal(notePosts, 1);
    assert.equal(recordReads, 1);
    assert.match(document.body.textContent, /Note added/);
    assert.match(document.querySelector('[role=alert]').textContent, /Reload notes/);
    await act(async () => document.querySelector('[role=alert] button').click());
    assert.equal(notePosts, 1);
    assert.equal(recordReads, 1);
    assert.match(document.body.textContent, /New fixture note/);
    assert.match(document.body.textContent, /Note added/);
  } finally {
    await act(async () => root.unmount());
  }
});
