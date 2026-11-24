const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const swc=require('next/dist/build/swc'),{JSDOM}=require('jsdom');
const initialDom=new JSDOM("",{url:"http://localhost"});
Object.assign(global,{window:initialDom.window,document:initialDom.window.document,HTMLElement:initialDom.window.HTMLElement});
function load(file, globals={}, mocks={}){
 const source=swc.transformSync(fs.readFileSync(file,'utf8'),{filename:file,jsc:{target:'es2020',parser:{syntax:'typescript',tsx:file.endsWith('.tsx')},transform:{react:{runtime:'automatic'}}},module:{type:'commonjs'}}).code;
 const module={exports:{}};
 vm.runInNewContext(source,{module,exports:module.exports,require:name=>mocks[name]??(name.endsWith("/language-context")?{useLanguage:()=>({language:"es"})}:require(name)),console,URL,AbortController,...globals},{filename:file});return module.exports;
}
function environment(){const dom=new JSDOM('<html lang="es"><body></body></html>',{url:'http://localhost'});return {window:dom.window,document:dom.window.document};}
test('phone validation uses US/GB metadata and preserves optional fields',()=>{
 const {normalizePhone}=load('app/auth/phone.ts',{}, {'../../../../packages/shared/phone':load('../../packages/shared/phone.ts')});
 for(const [input,expected] of [['',null],['202-555-0123','+12025550123'],['+44 20 7946 0018','+442079460018'],['020 7946 0018','+442079460018'],['07400 123456','+447400123456']])assert.equal(normalizePhone(input),expected);
 for(const input of ['letters','202abc5550123','123','+44123','++12025550123','+12025550123('])assert.throws(()=>normalizePhone(input));
});
test('safe auth errors, status semantics, language and retained session',async()=>{
 const env=environment();let response;
 const session=load('app/auth/session.ts',{...env,process:{env:{}},fetch:async()=>response});
 session.saveAccessToken('synthetic-session');
 response={ok:false,status:401,json:async()=>({detail:'PRIVATE_INTERNAL_DETAIL'})};
 await assert.rejects(session.authRequest('/auth/login',{}),e=>e.message==='Correo electrónico o contraseña incorrectos.'&&session.isUnauthorized(e));
 env.document.documentElement.lang='en';
 await assert.rejects(session.authRequest('/auth/login',{}),e=>e.message==='Incorrect email or password.');
 response={ok:false,status:403,json:async()=>({detail:'PRIVATE_INTERNAL_DETAIL'})};
 await assert.rejects(session.apiRequest('/profiles/me'),e=>!session.isUnauthorized(e)&&!e.message.includes('PRIVATE')&&!e.message.includes('HTTP'));
 assert.equal(session.getAccessToken(),'synthetic-session');
 response={ok:false,status:500,json:async()=>({detail:'PRIVATE_INTERNAL_DETAIL'})};
 await assert.rejects(session.apiRequest('/auth/me'),e=>e.code==='server');
 assert.equal(session.accountDestination({profile:null,role:'user'}),'/account/profile');
 const account={profile:{},role:'admin'};
 assert.equal(session.accountDestination(account),'/dashboard');
 assert.equal(session.accountDestination(account,'/backoffice/incidents'),'/backoffice/incidents');
 assert.equal(session.accountDestination(account,'//other.example/backoffice'),'/dashboard');
 assert.equal(session.accountDestination({profile:null,role:'user'},'/talents'),'/account/profile');
});
test('network errors do not expose raw exceptions or remove tokens',async()=>{
 const env=environment();const session=load('app/auth/session.ts',{...env,process:{env:{}},fetch:async()=>{throw Error('PRIVATE_URL_SECRET')}});
 session.saveAccessToken('synthetic');await assert.rejects(session.apiRequest('/auth/me'),e=>e.code==='network'&&!e.message.includes('PRIVATE'));
 assert.equal(session.getAccessToken(),'synthetic');
});
test('profile component: save failure retains inputs and token; success goes to dashboard',async()=>{
 const React=require('react'),{createRoot}=require('react-dom/client'),{act}=React;
 const dom=new JSDOM('<div id="root"></div>',{url:'http://localhost'});
 Object.assign(global,{window:dom.window,document:dom.window.document,HTMLElement:dom.window.HTMLElement,IS_REACT_ACT_ENVIRONMENT:true});
 let fail=true;const destinations=[],calls=[];
 const mocks={react:React,'next/link':({children,href,...props})=>React.createElement('a',{href,...props},children),'next/navigation':{useRouter:()=>router},'../../components/phone-input':{PhoneInput:props=>React.createElement('input',props)},'../../auth/phone':{phoneError:()=>'',normalizePhone:v=>v||null}};
 const router={replace:value=>destinations.push(value)};
 mocks['../../auth/session']={getAccessToken:()=> 'synthetic-token',clearAccessToken:()=>assert.fail('must retain session'),isUnauthorized:()=>false,hasStatus:(e,status)=>e.status===status,
 apiRequest:async(url,opts)=>{calls.push([url,opts]);if(!opts?.method)return {id:1,user_id:1,name:'Saved Name',phone:null,address:null};if(fail)throw Error('Connection unavailable');return {id:1,user_id:1,name:'Saved Name',phone:null,address:null};}};
 const Page=load('app/account/profile/page.tsx',{},mocks).default,root=createRoot(document.querySelector('#root'));
 await act(async()=>{root.render(React.createElement(Page));});
 assert.equal(document.querySelector('#profile-name').value,'Saved Name');
 await act(async()=>{document.querySelector('form').dispatchEvent(new window.Event('submit',{bubbles:true,cancelable:true}));});
 assert.equal(document.querySelector('#profile-name').value,'Saved Name');assert.deepEqual(destinations,[]);
 assert.ok(document.querySelector('[role=alert]'));fail=false;
 await act(async()=>{document.querySelector('form').dispatchEvent(new window.Event('submit',{bubbles:true,cancelable:true}));});
 assert.deepEqual(destinations,['/dashboard']);assert.equal(calls.at(-1)[1].method,'PUT');
 await act(async()=>root.unmount());dom.window.close();
});
test('password cancellation has explicit destinations and never submits',async()=>{
 const React=require('react'),{createRoot}=require('react-dom/client'),{act}=React;
 const dom=new JSDOM('<div id="root"></div>',{url:'http://localhost'});Object.assign(global,{window:dom.window,document:dom.window.document,HTMLElement:dom.window.HTMLElement,IS_REACT_ACT_ENVIRONMENT:true});
 let passwordCalls=0;const router={replace:()=>{}};
 const Page=load('app/account/change-password/page.tsx',{}, {'react':React,'next/link':({children,href,...props})=>React.createElement('a',{href,...props,onClick:e=>e.preventDefault()},children),'next/navigation':{useRouter:()=>router},'../../auth/session':{getAccessToken:()=> 'synthetic',apiRequest:async()=>({}),authRequest:async()=>{passwordCalls++;return{}},isUnauthorized:()=>false,clearAccessToken:()=>assert.fail('cancel must not logout')}}).default;
 const root=createRoot(document.querySelector('#root'));await act(async()=>root.render(React.createElement(Page)));
 for(const value of ['', 'partial']){document.querySelector('#current-password').value=value;for(const link of document.querySelectorAll('a')){assert.equal(link.getAttribute('href'),'/dashboard');await act(async()=>link.click());}}
 assert.equal(passwordCalls,0);await act(async()=>root.unmount());dom.window.close();
});
test('password verification failure can retry without enabling unverified changes',async()=>{
 const React=require('react'),{createRoot}=require('react-dom/client'),{act}=React;
 const dom=new JSDOM('<div id="root"></div>',{url:'http://localhost'});
 Object.assign(global,{window:dom.window,document:dom.window.document,HTMLElement:dom.window.HTMLElement,IS_REACT_ACT_ENVIRONMENT:true});
 let attempts=0,passwordCalls=0,resolveVerification;const router={replace:()=>assert.fail('must retain session')};
 const Page=load('app/account/change-password/page.tsx',{}, {'react':React,'next/link':({children,href})=>React.createElement('a',{href},children),'next/navigation':{useRouter:()=>router},'../../auth/session':{getAccessToken:()=> 'synthetic',apiRequest:async()=>{if(++attempts===1)throw Error('No se pudo conectar.');return new Promise(resolve=>resolveVerification=resolve);},authRequest:async()=>{passwordCalls++;},isUnauthorized:()=>false,clearAccessToken:()=>assert.fail('must retain token')}}).default;
 const root=createRoot(document.querySelector('#root'));await act(async()=>root.render(React.createElement(Page)));
 const submit=()=>document.querySelector('button:not([type="button"])');
 assert.equal(submit().disabled,true);assert.match(document.querySelector('[role=alert]').textContent,/No se pudo/);
 assert.equal(document.querySelector('[role=status]'),null);
 await act(async()=>document.querySelector('form').dispatchEvent(new window.Event('submit',{bubbles:true,cancelable:true})));
 assert.equal(passwordCalls,0);
 await act(async()=>document.querySelector('button[type=button]').click());
 assert.equal(submit().disabled,true);assert.match(document.querySelector('[role=status]').textContent,/Verificando/);
 await act(async()=>resolveVerification({}));assert.equal(submit().disabled,false);assert.equal(attempts,2);
 await act(async()=>root.unmount());dom.window.close();
});

test('client validates successful JSON and permits the documented empty responses', async () => {
 const env=environment();
 let response;
 const api=load('app/auth/session.ts',{...env,process:{env:{}},fetch:async()=>response});
 for (const invalid of [new Response('<html>'), Response.json({role:'user'}), Response.json(null)]) {
  response=invalid;
  await assert.rejects(api.apiRequest('/auth/me'),error=>error.code==='invalid_response');
 }
 response=Response.json({email:'fixture@example.com',role:'manager',profile:null});
 assert.equal((await api.apiRequest('/auth/me')).role,'manager');
 response=Response.json([]);
 assert.deepEqual(await api.apiRequest('/users'),[]);
 response=new Response('<html>',{status:404});
 await assert.rejects(api.apiRequest('/profiles/me'),error=>error.code==='invalid_response'&&!api.hasStatus(error,404));
 response=Response.json({detail:'Profile not found'},{status:404});
 await assert.rejects(api.apiRequest('/profiles/me'),error=>api.hasStatus(error,404));
 response=new Response(null,{status:204});
 assert.equal(await api.apiRequest('/profiles/1',{method:'DELETE'}),undefined);
 response=Response.json({detail:[{loc:['body','new_password'],type:'password_too_long'}]},{status:422});
 await assert.rejects(api.authRequest('/auth/change-password',{}),error=>error.code==='password_too_long'&&error.message.includes('72 bytes'));
 env.window.close();
});

test('session gate distinguishes rejected authentication from temporary failure', async () => {
 const {NextRequest}=require('next/server');
 const expectedNext='/backoffice/incidents?status=open';
 const request=pathname=>new NextRequest('http://localhost'+pathname,{headers:{cookie:'healthcore_access_token=fixture'}});
 for(const makeResponse of [
  ()=>Response.json({detail:'Temporarily unavailable'},{status:503}),
  ()=>new Response('<html>'),
  ()=>new Response('<html>',{status:401}),
  ()=>Response.json({role:'admin'}),
  ()=>{throw Error('synthetic connection failure');},
 ]){
  const {proxy}=load('proxy.ts',{Headers,process:{env:{}},fetch:async()=>makeResponse()});
  const page=await proxy(request(expectedNext));
  const location=new URL(page.headers.get('location'));
  assert.equal(location.pathname,'/login');
  assert.equal(location.searchParams.get('session'),'unavailable');
  assert.equal(location.searchParams.get('next'),expectedNext);
  assert.equal(page.headers.get('set-cookie'),null);
  assert.equal((await proxy(request('/api/tracker/records'))).status,503);
 }
 const {proxy}=load('proxy.ts',{Headers,process:{env:{}},fetch:async()=>Response.json({detail:'Expired'},{status:401})});
 const page=await proxy(request(expectedNext));
 assert.equal(new URL(page.headers.get('location')).searchParams.get('session'),null);
 assert.match(page.headers.get('set-cookie'),/healthcore_access_token=;/);
 assert.equal((await proxy(request('/api/tracker/records'))).status,401);
});

function componentEnvironment() {
 const React=require('react'),{createRoot}=require('react-dom/client'),{act}=React;
 const dom=new JSDOM('<div id="root"></div>',{url:'http://localhost'});
 Object.assign(global,{window:dom.window,document:dom.window.document,HTMLElement:dom.window.HTMLElement,IS_REACT_ACT_ENVIRONMENT:true});
 const router={replace:()=>{},push:()=>{}};
 const mocks={'next/link':({children,...props})=>React.createElement('a',props,children),
  'next/navigation':{useRouter:()=>router,useSearchParams:()=>new URLSearchParams()},
  '../../components/phone-input':{PhoneInput:props=>React.createElement('input',props)},
  '../../auth/phone':{normalizePhone:value=>value||null,phoneError:()=>''}};
 const root=createRoot(document.querySelector('#root'));
 const submit=form=>act(async()=>form.dispatchEvent(new window.Event('submit',{bubbles:true,cancelable:true})));
 return {React,act,dom,root,mocks,submit};
}

test('failed password recovery keeps the email and allows retry in English',async()=>{
 const {React,act,dom,root,mocks,submit}=componentEnvironment();
 let attempts=0;
 const Page=load('app/forgot-password/page.tsx',{Error},{
  ...mocks,'../components/brand-logo':()=>null,'../components/language-context':{useLanguage:()=>({language:'en'})},
  '../auth/session':{authRequest:async(_url,body)=>{
   assert.equal(body.email,'fixture@example.com');
   if(++attempts===1) throw new Error('Try again later.');
  }},
 }).default;
 try{
  await act(async()=>root.render(React.createElement(Page)));
  const input=document.querySelector('input');
  await act(async()=>{
   Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype,'value').set.call(input,'fixture@example.com');
   input.dispatchEvent(new window.Event('input',{bubbles:true}));
   input.dispatchEvent(new window.Event('change',{bubbles:true}));
  });
  await submit(input.form);
  assert.match(document.querySelector('[role=alert]').textContent,/Try again/);
  assert.equal(input.value,'fixture@example.com');
  await submit(input.form);
  assert.match(document.querySelector('[role=status]').textContent,/If an account exists/);
  assert.equal(document.querySelector('form'),null);
 }finally{await act(async()=>root.unmount());dom.window.close();}
});

test('profile permits creation only after the API confirms a 404',async()=>{
 const {React,act,dom,root,mocks,submit}=componentEnvironment();
 const attempts=[502,0,404];
 const methods=[];
 const Page=load('app/account/profile/page.tsx',{Error},{
  ...mocks,'../../auth/session':{getAccessToken:()=>true,isUnauthorized:()=>false,hasStatus:(error,status)=>error.status===status,
   apiRequest:async(_path,options)=>{
    if(options.method){methods.push(options.method);return {id:1,user_id:1};}
    throw Object.assign(new Error('Profile unavailable'),{status:attempts.shift()});
   }},
 }).default;
 try{
  await act(async()=>root.render(React.createElement(Page)));
  for(const expected of [2,1]){
   assert.equal(attempts.length,expected);
   assert.equal(document.querySelector('form'),null);
   assert.match(document.querySelector('[role=alert]').textContent,/cargar el perfil/);
   await act(async()=>document.querySelector('[role=alert] button').click());
  }
  assert.equal(document.querySelector('form button').textContent,'Crear perfil');
  await submit(document.querySelector('form'));
  assert.deepEqual(methods,['POST']);
 }finally{await act(async()=>root.unmount());dom.window.close();}
});

test('admin ignores a late account and sends the subsequent write to the selected ID',async()=>{
 const {React,act,dom,root,mocks,submit}=componentEnvironment();
 const users=[{id:1,email:'one@example.com',role:'user',is_active:true,profile:null},{id:2,email:'two@example.com',role:'user',is_active:true,profile:null}];
 const pending=new Map();
 const writes=[];
 let finishWrite;
 const Page=load('app/admin/users/page.tsx',{window,Error},{
  ...mocks,'../../auth/session':{getAccessToken:()=>true,isUnauthorized:()=>false,
   apiRequest:async(url,options)=>{
    if(options?.method){writes.push([url,options.method]);return new Promise(resolve=>finishWrite=resolve);}
    if(url==='/users')return users;
    return new Promise(resolve=>pending.set(url,resolve));
   }},
 }).default;
 try{
  await act(async()=>root.render(React.createElement(Page)));
  const [first,second]=document.querySelectorAll('li button');
  await act(async()=>first.click());
  await act(async()=>second.click());
  assert.equal(document.querySelector('form'),null);
  await act(async()=>pending.get('/users/2')(users[1]));
  await act(async()=>pending.get('/users/1')(users[0]));
  assert.match(document.querySelector('h2.mt-1').textContent,/two@example.com/);
  await submit(document.querySelector('form'));
  assert.deepEqual(writes,[['/users/2','PUT']]);
  await act(async()=>first.click());
  await act(async()=>pending.get('/users/1')(users[0]));
  await act(async()=>finishWrite({...users[1],email:'updated-two@example.com'}));
  assert.match(document.querySelector('h2.mt-1').textContent,/one@example.com/);
  assert.match(document.querySelector('li:nth-child(2)').textContent,/updated-two@example.com/);
 }finally{await act(async()=>root.unmount());dom.window.close();}
});

test('admin dashboard distinguishes a failed user count from a confirmed empty list', async () => {
 const {React,act,dom,root,mocks}=componentEnvironment();
 let attempts=0;
 const Page=load('app/dashboard/page.tsx',{Error},{
  ...mocks,'../components/language-context':{useLanguage:()=>({language:'en'})},
  '../components/phone-input':mocks['../../components/phone-input'],
  '../auth/phone':mocks['../../auth/phone'],
  '../auth/session':{getAccessToken:()=>true,isUnauthorized:()=>false,apiRequest:async url=>{
   if(url==='/auth/me')return {email:'fixture@example.com',role:'admin',profile:{name:'Fixture'}};
   if(++attempts===1)throw new Error('The service is temporarily unavailable. Try again.');
   return [];
  }},
  'lucide-react':Object.fromEntries(['Activity','ArrowUpRight','BriefcaseMedical','CircleUserRound','RefreshCw','ShieldCheck','Users'].map(icon=>[icon,()=>null])),
 }).default;
 try{
  await act(async()=>root.render(React.createElement(Page)));
  const countCard=[...document.querySelectorAll('article')].find(card=>card.textContent.includes('Registered users'));
  assert.match(countCard.querySelector('[role=alert]').textContent,/temporarily unavailable/);
  assert.equal(countCard.querySelector('.text-2xl'),null);
  await act(async()=>countCard.querySelector('button').click());
  const reloaded=[...document.querySelectorAll('article')].find(card=>card.textContent.includes('Registered users'));
  assert.equal(reloaded.querySelector('.text-2xl').textContent,'0');
  assert.equal(reloaded.querySelector('[role=alert]'),null);
 }finally{await act(async()=>root.unmount());dom.window.close();}
});
