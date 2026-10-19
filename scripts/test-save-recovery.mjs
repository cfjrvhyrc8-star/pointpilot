import assert from 'node:assert/strict';
import fs from 'node:fs';
import {saveWithRecovery} from '../lib/save-recovery.js';
const harness=()=>{const state={saving:false,saved:true,error:'old',success:0};return {state,options:{setSaving:v=>state.saving=v,setSaved:v=>state.saved=v,setError:v=>state.error=v,onSuccess:()=>state.success++}}};
for(const request of [()=>({error:new Error('denied')}),()=>Promise.reject(new Error('offline')),()=>{throw new Error('unexpected')}]){
 const {state,options}=harness();await saveWithRecovery({...options,request},30);
 assert.equal(state.saving,false);assert.equal(state.saved,false);assert.equal(state.success,0);assert.ok(state.error);
}
const ok=harness();await saveWithRecovery({...ok.options,request:()=>({data:{id:1},error:null,status:200})},30);
assert.equal(ok.state.saving,false);assert.equal(ok.state.saved,true);assert.equal(ok.state.success,1);assert.equal(ok.state.error,'');
const late=harness();let resolveLate,signal;
await saveWithRecovery({...late.options,request:s=>{signal=s;return new Promise(resolve=>resolveLate=resolve)}},5);
assert.equal(signal.aborted,true);assert.equal(late.state.saving,false);assert.equal(late.state.saved,false);assert.match(late.state.error,/server may have received/);
resolveLate({data:{id:2},error:null,status:200});await new Promise(resolve=>setTimeout(resolve,0));assert.equal(late.state.success,0);assert.equal(late.state.saved,false);
await saveWithRecovery({...late.options,request:()=>({data:{id:2},error:null,status:200})},30);assert.equal(late.state.saved,true);assert.equal(late.state.error,'');
const callback=harness();await saveWithRecovery({...callback.options,request:()=>({error:null,status:200}),onSuccess:()=>{throw new Error('render failed')}},30);assert.equal(callback.state.saving,false);assert.equal(callback.state.saved,false);assert.match(callback.state.error,/render failed/);
for(const response of [undefined,null,{},'',false,{error:null},{error:undefined,status:200},{error:null,status:0},{error:null,status:500},{error:null,status:302}]){
 const check=harness();await saveWithRecovery({...check.options,request:()=>response},30);
 assert.equal(check.state.saved,false);assert.equal(check.state.saving,false);assert.equal(check.state.success,0);assert.match(check.state.error,/did not confirm/);
}
// Minimal-return writes legitimately have no response body.
const minimal=harness();await saveWithRecovery({...minimal.options,request:()=>({data:null,error:null,status:204})},30);assert.equal(minimal.state.saved,true);
for(const path of ['app/dashboard/TripGoal.js','app/dashboard/MonthlyRewardPlan.js']){const source=fs.readFileSync(path,'utf8');assert.match(source,/await saveWithRecovery/);assert.match(source,/\.abortSignal\(signal\)/);}
const css=fs.readFileSync('styles/dashboard-mobile.css','utf8');assert.match(css,/@media\(min-width:851px\)/);assert.match(css,/::-webkit-datetime-edit\{display:inline-flex;align-items:center;height:100%/);
console.log('Save recovery: success, returned error, rejection, throw, timeout, abort, late response, retry and callback failure passed; component wiring and desktop date CSS checked.');
