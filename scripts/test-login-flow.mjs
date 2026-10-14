import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createRequire} from 'node:module';
import {authStep} from '../lib/auth-timeout.js';
const require=createRequire(import.meta.url);
const source=fs.readFileSync(new URL('../app/login/page.js',import.meta.url),'utf8');
const ast=require('next/dist/compiled/babel/parser').parse(source,{sourceType:'module',plugins:['jsx']});
const login=ast.program.body.find(n=>n.type==='ExportDefaultDeclaration').declaration;
const funcs=login.body.body.filter(n=>n.type==='FunctionDeclaration').map(n=>source.slice(n.start,n.end)).join('\n');
const friendly=ast.program.body.find(n=>n.type==='FunctionDeclaration');
async function run({cleanup=async()=>{},otp=async()=>({error:null}),oauth=async()=>({data:{url:'https://example.com'},error:null}),social=false}={}){
  const result={loading:[],messages:[],sent:0,redirects:[]};
  const storage=new Map();
  const handlers=new Function('clearPointPilotSession','getSupabase','authStep','window','setLoading','setMsg','setActiveEmail',`
    let loading=false; const name='Test',email='test@example.com';
    ${source.slice(friendly.start,friendly.end)}
    ${funcs}
    return {submit,socialLogin};
  `)(cleanup,()=>({auth:{signInWithOtp:()=>{result.sent++;return otp()},signInWithOAuth:oauth}}),(fn,label)=>authStep(fn,label,5),{localStorage:{setItem:(k,v)=>storage.set(k,v),removeItem:k=>storage.delete(k)},location:{origin:'https://example.com',assign:url=>result.redirects.push(url)}},v=>result.loading.push(v),v=>result.messages.push(v),()=>{});
  await (social?handlers.socialLogin('facebook'):handlers.submit({preventDefault(){}}));
  assert.equal(result.loading.at(-1),false);
  return result;
}
assert.match((await run()).messages.at(-1),/^Secure/);
const cleanup=await run({cleanup:()=>new Promise(()=>{})});
assert.equal(cleanup.sent,0);
assert.match(cleanup.messages.at(-1),/Previous session cleanup timed out/);
assert.match((await run({otp:()=>new Promise(()=>{})})).messages.at(-1),/Sign-in email request timed out/);
assert.match((await run({otp:async()=>({error:new Error('Email rate limit exceeded')})})).messages.at(-1),/rate limit/);
assert.match((await run({cleanup:async()=>{throw new Error('storage blocked')}})).messages.at(-1),/storage blocked/);
assert.match((await run({social:true,oauth:()=>new Promise(()=>{})})).messages.at(-1),/Facebook sign-in timed out/);
assert.equal((await run({social:true})).redirects.length,1);
console.log('Login flow: success and 5 failure paths restore controls; cleanup failure never sends email.');
