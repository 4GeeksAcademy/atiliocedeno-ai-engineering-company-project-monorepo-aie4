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
 assert.equal(trackerApiUrl('/records/123/notes',true),'https://example.test/api/records/123/notes');
});
test('document language follows routes and retains preference on auth pages',async()=>{
 const React=require('react'),{act}=React,{createRoot}=require('react-dom/client');
 const dom=new JSDOM('<div id="root"></div>',{url:'http://localhost'});
 Object.assign(global,{window:dom.window,document:dom.window.document,IS_REACT_ACT_ENVIRONMENT:true});
 let pathname='/en';const {LanguageProvider}=load('app/components/language-context.tsx',{document,sessionStorage:dom.window.sessionStorage},{'next/navigation':{usePathname:()=>pathname}});
 const root=createRoot(document.querySelector('#root'));
 for(const [route,expected] of [['/en','en'],['/en/care-request','en'],['/login','en'],['/care-request','es'],['/talents/en/new','en'],['/talents/new','es'],['/talents/123','es'],['/','es']]){
  pathname=route;await act(async()=>root.render(React.createElement(LanguageProvider,null,route)));assert.equal(document.documentElement.lang,expected,route);
 }
 await act(async()=>root.unmount());dom.window.close();
});

test('proxy supplies initial language for all Tracker routes',()=>{
 const {proxy,config}=load('proxy.ts',{Headers},{'next/server':{NextResponse:{next:options=>options}}});
 assert.ok(config.matcher.includes('/talents/:path*'));
 for(const [pathname,expected] of [['/talents','es'],['/talents/en','en'],['/talents/new','es'],['/talents/en/new','en'],['/talents/test-123','es'],['/talents/en/test-123','en']]){
  const result=proxy({headers:new Headers({'x-healthcore-language':'wrong'}),nextUrl:{pathname}});
  assert.equal(result.request.headers.get('x-healthcore-language'),expected);
 }
});
// Execute the original operation bodies with an in-memory fetch double; no network.
for(const english of [false,true]) for(const configured of [false,true]) test(`Tracker operation contracts: ${english?'EN':'ES'}, configured=${configured}`,async()=>{
 const payload={full_name:'Test Person',email:'test@example.com',phone:'123',position:'QA',linkedin_url:'https://example.test/link',cv_url:'https://example.test/cv',status:'received',stage:'pending',experience_years:'3'};
 const cases=[
  ['app/talents/talent-pipeline.tsx','fetchAllRecords','GET','/records?page=1&limit=1000',undefined],
  ['app/talents/new/new-talent.tsx','createRecord','POST','/records',{...payload,experience_years:3}],
  ['app/talents/[id]/talent-detail.tsx','loadDetail','GET','/records/test%2F123',undefined],
  ['app/talents/[id]/talent-detail.tsx','saveRecord','PUT','/records/test%2F123',{...payload,experience_years:3}],
  ['app/talents/[id]/talent-detail.tsx','addNote','POST','/records/test%2F123/notes',{content:'Test note'}],
  ['app/talents/[id]/talent-detail.tsx','deleteNote','DELETE','/records/test%2F123/notes/n%2F1',undefined],
  ['app/talents/[id]/talent-detail.tsx','deleteRecord','DELETE','/records/test%2F123',undefined],
 ];
 for(const [file,name,method,path,body] of cases){
  const calls=[],errors=[];
  const env={NEXT_PUBLIC_API_URL:configured?'https://example.test/api/':undefined};
  const {trackerApiUrl}=load('app/talents/api-url.ts',{process:{env},Error});
  const noop=()=>{};
  const globals={Error,DOMException,URLSearchParams,trackerApiUrl,isEnglish:english,id:'test/123',form:payload,noteText:' Test note ',record:{full_name:'Test Person'},RECORDS_PAGE_SIZE:1000,
   setSaving:noop,setError:value=>{if(value)errors.push(value)},setMessage:noop,setRecord:noop,setForm:noop,setNotes:noop,setNoteText:noop,invalidateRecordsCache:noop,router:{push:noop},window:{confirm:()=>true},
   createdRecordFromPayload:x=>x,recordFromPayload:x=>x,recordsFromPayload:()=>[],parseRecords:()=>[],loadDetail:async()=>{},
   fetch:async(url,options={})=>{calls.push({url,method:options.method??'GET',body:options.body});return {ok:true,json:async()=>({id:'test/123',experience_years:3})}},
   transformSource:source=>{const start=source.indexOf(`async function ${name}(`);assert.ok(start>=0);const ending=name==='fetchAllRecords'?'\n}':'\n  }';const end=source.indexOf(ending,start)+ending.length;return 'export '+source.slice(start,end);}
  };
  const operation=load(file,globals)[name];
  try {await operation(name==='fetchAllRecords'?undefined:name==='deleteNote'?{id:'n/1'}:{preventDefault:noop},english);}catch(error){errors.push(error.message);}
  if(!configured){assert.equal(calls.length,0,name);assert.equal(errors.length,1,name);assert.match(errors[0],english?/not configured/:/no está configurado/);}
  else {assert.equal(errors.length,0,name);assert.equal(calls[0].url,'https://example.test/api'+path,name);assert.equal(calls[0].method,method,name);assert.deepEqual(calls[0].body?JSON.parse(calls[0].body):undefined,body,name);if(name==='loadDetail')assert.equal(calls[1].url,'https://example.test/api/records/test%2F123/notes');}
 }
});
