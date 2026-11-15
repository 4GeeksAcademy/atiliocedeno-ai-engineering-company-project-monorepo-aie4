const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const swc=require('next/dist/build/swc'),{JSDOM}=require('jsdom'),React=require('react'),{renderToStaticMarkup}=require('react-dom/server');
function load(file,mocks={}){
 const code=swc.transformSync(fs.readFileSync(file,'utf8'),{filename:file,jsc:{parser:{syntax:'typescript',tsx:file.endsWith('.tsx')},transform:{react:{runtime:'automatic'}}},module:{type:'commonjs'}}).code;
 const module={exports:{}};vm.runInNewContext(code,{module,exports:module.exports,require:name=>mocks[name]??require(name),console});return module.exports;
}
for(const language of ['es','en'])test(`care ${language}: empty defaults, clinics, accessible errors and honest demo`,()=>{
 const Component=load(`app/public-site/Care${language==='en'?'En':'Es'}.tsx`,{'./care-shell':{CareShell:({children})=>React.createElement('div',{},children)},'./public-site.css':{}}).default;
 const dom=new JSDOM(renderToStaticMarkup(React.createElement(Component)),{url:`http://localhost/${language==='en'?'en/':''}care-request`});
 const d=dom.window.document;dom.window.HTMLElement.prototype.scrollIntoView=function(){};
 const {initializeCareForm}=load('app/public-site/care-behavior.js',{'../auth/phone':load('app/auth/phone.ts')});
 const cleanup=initializeCareForm(d.body,language),form=d.querySelector('form');
 assert.equal(d.querySelector('#sex').value,'');assert.equal(d.querySelector('#clinicCountry').value,'');assert.equal(d.querySelector('#clinic').disabled,true);
 const submit=()=>form.dispatchEvent(new dom.window.Event('submit',{bubbles:true,cancelable:true}));
 submit();assert.equal(d.activeElement.id,'fullname');
 assert.equal(d.querySelector('label[for=fullname] span').textContent,'*');
 assert.equal(d.querySelector('#fullname').getAttribute('aria-describedby'),'error-fullname');
 assert.equal(d.querySelector('#error-fullname').getAttribute('role'),'alert');
 assert.equal(d.querySelector('[name=has_allergies]').getAttribute('aria-describedby'),'error-radio-has_allergies');
 const country=d.querySelector('#clinicCountry'),clinic=d.querySelector('#clinic');
 for(const [value,count] of [['usa',10],['uk',4],['usa',10]]){country.value=value;country.dispatchEvent(new dom.window.Event('change'));assert.equal(clinic.options.length,count);assert.equal(clinic.disabled,false);assert.equal(clinic.value,'');clinic.selectedIndex=1;}
 for(const [id,value] of Object.entries({fullname:'Demo Person',birthdate:'1990-01-01',sex:language==='en'?'other':'otro',email:'demo@example.com',phone:'+12025550123',address:'123 Demo Street'})){d.getElementById(id).value=value;}
 for(const name of ['has_allergies','has_chronic','has_insurance'])d.querySelector(`[name=${name}][value=no]`).checked=true;
 submit();assert.equal(form.style.display,'none');assert.equal(d.querySelector('#error-fullname'),null);assert.equal(d.querySelector('#fullname').hasAttribute('aria-invalid'),false);
 assert.equal(d.querySelector('label[for=fullname] span').textContent,'*');
 const result=d.querySelector('[role=status]');assert.match(result.textContent,language==='en'?/No medical request was sent or saved/:/No se envió ni guardó/);assert.equal(result.querySelector('a').getAttribute('href'),language==='en'?'/en':'/');
 cleanup();dom.window.close();
});
