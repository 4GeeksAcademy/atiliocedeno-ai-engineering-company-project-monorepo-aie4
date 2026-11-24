const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const swc=require('next/dist/build/swc'),{JSDOM}=require('jsdom');
function load(file,globals={},mocks={}){
 const source=globals.transformSource ? globals.transformSource(fs.readFileSync(file,'utf8')) : fs.readFileSync(file,'utf8');
 const code=swc.transformSync(source,{filename:file,jsc:{parser:{syntax:'typescript',tsx:file.endsWith('.tsx')},transform:{react:{runtime:'automatic'}}},module:{type:'commonjs'}}).code;
 const module={exports:{}};vm.runInNewContext(code,{module,exports:module.exports,require:name=>mocks[name]??require(name),console,...globals});return module.exports;
}
test('Tracker rejects missing configuration and preserves API paths',()=>{
 for(const base of [undefined,'','  ']){
  const {trackerApiUrl}=load('app/talents/api-url.ts',{process:{env:{NEXT_PUBLIC_API_URL:base}}});
  assert.throws(()=>trackerApiUrl('/records',false),/no está configurado/);
  assert.throws(()=>trackerApiUrl('/records',true),/not configured/);
 }
 const {trackerApiUrl}=load('app/talents/api-url.ts',{process:{env:{NEXT_PUBLIC_API_URL:'https://example.test/api/'}}});
 assert.equal(trackerApiUrl('/records/123/notes',true),'/api/tracker/records/123/notes');
});
test('document language follows routes and retains preference on auth pages',async()=>{
 const React=require('react'),{act}=React,{createRoot}=require('react-dom/client');
 const dom=new JSDOM('<div id="root"></div>',{url:'http://localhost'});
 Object.assign(global,{window:dom.window,document:dom.window.document,IS_REACT_ACT_ENVIRONMENT:true});
 let pathname='/en';const {LanguageProvider}=load('app/components/language-context.tsx',{document,sessionStorage:dom.window.sessionStorage},{'next/navigation':{usePathname:()=>pathname}});
 const root=createRoot(document.querySelector('#root'));
 for(const [route,expected] of [['/talents/en','en'],['/login','en'],['/talents','es'],['/talents/en/new','en'],['/talents/new','es'],['/talents/123','es'],['/','es']]){
  pathname=route;await act(async()=>root.render(React.createElement(LanguageProvider,null,route)));assert.equal(document.documentElement.lang,expected,route);
 }
 await act(async()=>root.unmount());dom.window.close();
});

test('proxy supplies initial language for all Tracker routes',async()=>{
 const {proxy,config}=load('proxy.ts',{Headers,process:{env:{}},fetch:async()=>({ok:true,json:async()=>({email:'fixture@example.com',role:'user',profile:null})})},{'next/server':{NextResponse:{next:options=>options}}});
 assert.ok(config.matcher.includes('/talents/:path*'));
 for(const [pathname,expected] of [['/talents','es'],['/talents/en','en'],['/talents/new','es'],['/talents/en/new','en'],['/talents/test-123','es'],['/talents/en/test-123','en']]){
  const result=await proxy({cookies:{get:()=>({value:'synthetic'})},headers:new Headers({'x-healthcore-language':'wrong'}),nextUrl:{pathname}});
  assert.equal(result.request.headers.get('x-healthcore-language'),expected);
 }
});

for (const english of [false, true]) for (const configured of [false, true]) {
 test("Tracker request contracts: " + (english ? "EN" : "ES") + ", configured=" + configured, async () => {
  const calls = [];
  const api = load('app/talents/api-url.ts', {
   process: { env: { NEXT_PUBLIC_API_URL: configured ? 'https://example.test/api/' : undefined } },
   fetch: async (url, options = {}) => {
    calls.push({ url, method: options.method ?? 'GET', body: options.body });
    return { ok: true, json: async () => ({ data: [{ _id: 'test/123' }] }) };
   },
  });
  const operations = [
   ['GET', '/records?page=1&limit=1000'],
   ['POST', '/records', { full_name: 'Test Person' }],
   ['GET', '/records/test%2F123'],
   ['PUT', '/records/test%2F123', { experience_years: 3 }],
   ['GET', '/records/test%2F123/notes'],
   ['POST', '/records/test%2F123/notes', { content: 'Test note' }],
   ['DELETE', '/records/test%2F123/notes/n%2F1'],
   ['DELETE', '/records/test%2F123'],
  ];
  for (const [method, path, body] of operations) {
   const request = () => api.trackerRequest(path, english, { method, body: body && JSON.stringify(body) });
   if (!configured) {
    await assert.rejects(request, english ? /not configured/ : /no está configurado/);
    assert.equal(calls.length, 0);
   } else {
    await request();
    assert.deepEqual(calls.at(-1), { url: '/api/tracker' + path, method, body: body && JSON.stringify(body) });
   }
  }
 });
}
