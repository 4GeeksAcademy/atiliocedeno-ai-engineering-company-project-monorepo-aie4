const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const {JSDOM}=require('jsdom');
const html=fs.readFileSync('index.html','utf8');
const script=fs.readFileSync('incidents.js','utf8');
const report={total_records:100,valid_records:94,invalid_records:6,average_satisfaction:3.58,
 categories:{APPOINTMENT:30,BILLING:20,CLINICAL_CARE:14,ACCESSIBILITY:17,ADMINISTRATIVE:13},
 statuses:{OPEN:28,CLOSED:52,DISCARDED:14},countries:{US:61,UK:33},
 satisfaction_distribution:{1:3,2:5,3:12,4:23,5:9},closed_with_valid_satisfaction:52,
 invalid_breakdown:{by_rule:{invalid_or_missing_clinic:1,country_clinic_mismatch:1,invalid_or_missing_category:1,invalid_description:1,invalid_or_missing_patient_id:1,closed_without_satisfaction_score:1}}};
function setup(t){
 const dom=new JSDOM(html,{url:'http://localhost:4174/',runScripts:'outside-only'}),w=dom.window;
 t.after(()=>w.close());w.eval(script);
 w.document.querySelector('#api-token').value='synthetic-token';
 Object.defineProperty(w.document.querySelector('#incident-file'),'files',{configurable:true,value:[new w.File(['synthetic'],'input.csv',{type:'text/csv'})]});
 return w;
}
test('file selection, upload, loading, actual result rendering and navigation',async t=>{
 const w=setup(t);let resolve,request;
 w.fetch=(url,options)=>{request={url,options};return new Promise(r=>resolve=r)};
 const pending=w.eval('submit()');
 assert.equal(w.document.querySelector('form').getAttribute('aria-busy'),'true');
 assert.equal(w.document.querySelector('button[type=submit]').disabled,true);
 assert.match(w.document.querySelector('#incident-results').textContent,/Analyzing/);
 assert.equal(request.url,'http://localhost:8000/api/incidents/analyze');assert.equal(request.options.method,'POST');
 assert.equal(request.options.headers.Authorization,'Bearer synthetic-token');assert.equal(request.options.body.get('file').name,'incident-upload.csv');
 resolve({ok:true,json:async()=>report});await pending;
 assert.deepEqual([...w.document.querySelectorAll('.incident-stat')].map(e=>e.textContent),['Total records100','Valid records94','Invalid records6','Average satisfaction3.58']);
 assert.match(w.document.querySelector('.incident-warning').textContent,/6 invalid records/);
 assert.equal(w.document.querySelectorAll('.incident-breakdowns section').length,5);
 assert.equal(w.document.querySelector('button[type=submit]').disabled,false);
 for(const link of w.document.querySelectorAll('nav a[href^="#"]')) assert.ok(w.document.querySelector(link.getAttribute('href')));
});
test('export uses GET without a file and downloads results.csv',async t=>{
 const w=setup(t);Object.defineProperty(w.document.querySelector('#incident-file'),'files',{value:[]});
 let request,download;
 w.fetch=async(url,options)=>{request={url,options};return {ok:true,blob:async()=>new w.Blob(['metric,value\nvalid_records,94'])}};
 w.URL.createObjectURL=()=> 'blob:synthetic';w.URL.revokeObjectURL=()=>{};
 w.HTMLAnchorElement.prototype.click=function(){download=this.download};
 await w.eval('submit(true)');assert.equal(request.options.method,'GET');assert.equal(request.options.body,undefined);
 assert.equal(request.url,'http://localhost:8000/api/incidents/results/export');assert.equal(download,'results.csv');
});
test('file validation prevents requests',async t=>{
 const w=setup(t);w.fetch=()=>{throw Error('Should not fetch')};
 Object.defineProperty(w.document.querySelector('#incident-file'),'files',{value:[new w.File(['x'],'input.txt')]});
 await w.eval('submit()');assert.match(w.document.querySelector('.incident-error').textContent,/Select a CSV/);
});
test('backend errors and network failures are safe',async t=>{
 const w=setup(t);
 for(const response of [{ok:false,status:401,json:async()=>({})},{ok:false,status:500,json:async()=>({detail:{code:'PRIVATE_SENTINEL'}})}]){
  w.fetch=async()=>response;await w.eval('submit()');assert.ok(w.document.querySelector('.incident-error'));
  assert.ok(!w.document.body.textContent.includes('PRIVATE_SENTINEL'));
 }
 w.fetch=async()=>{throw Error('PRIVATE_SENTINEL')};await w.eval('submit()');assert.match(w.document.querySelector('.incident-error').textContent,/Unable to reach/);
 assert.equal(w.document.querySelector('form').getAttribute('aria-busy'),'false');
});
test('changing account clears results; empty analysis has all zero groups',async t=>{
 const w=setup(t);const empty=structuredClone(report);empty.invalid_records=0;empty.average_satisfaction=null;
 for(const group of ['categories','statuses','countries','satisfaction_distribution'])for(const key of Object.keys(empty[group]))empty[group][key]=0;
 w.renderReport(empty);assert.equal(w.document.querySelector('.incident-warning'),null);assert.match(w.document.querySelector('#incident-results').textContent,/N\/A/);
 assert.equal(w.document.querySelectorAll('.incident-breakdowns section')[0].querySelectorAll('li').length,5);
 w.document.querySelector('#api-token').dispatchEvent(new w.Event('input'));assert.equal(w.document.querySelector('#incident-results').textContent,'');
});
