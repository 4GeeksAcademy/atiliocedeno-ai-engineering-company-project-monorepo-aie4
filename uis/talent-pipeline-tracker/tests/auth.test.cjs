const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const ts=require('typescript'),{JSDOM}=require('jsdom');
function load(file, globals={}, mocks={}){
 const source=ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020,jsx:ts.JsxEmit.ReactJSX}}).outputText;
 const module={exports:{}};
 vm.runInNewContext(source,{module,exports:module.exports,require:name=>mocks[name]??require(name),console,AbortController,...globals},{filename:file});return module.exports;
}
function environment(){const dom=new JSDOM('<html lang="es"><body></body></html>',{url:'http://localhost'});return {window:dom.window,document:dom.window.document};}
test('phone validation uses US/GB metadata and preserves optional fields',()=>{
 const {normalizePhone}=load('app/auth/phone.ts');
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
 assert.equal(session.accountDestination({profile:{},role:'admin'}),'/dashboard');
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
