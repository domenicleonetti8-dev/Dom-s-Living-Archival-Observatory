const fs=require('fs');
const vm=require('vm');
const assert=require('assert');

let postCount=0,lastBody=null;
const localStorage={getItem(){throw new Error('storage blocked')},setItem(){throw new Error('storage blocked')}};
const document={visibilityState:'visible',querySelector(){return null}};
const sandbox={console,Date,Math,Number,String,Array,Object,Map,Set,JSON,URL,Uint8Array,localStorage,document,location:{href:'https://example.test/index.html',pathname:'/index.html'},crypto:{getRandomValues(buf){for(let i=0;i<buf.length;i++)buf[i]=(i+11)%256;return buf}},fetch:async(url,opts)=>{postCount++;lastBody=JSON.parse(opts.body);return{ok:true,status:200,statusText:'OK',json:async()=>({totalVisitors:12,liveNow:3,generatedAt:'2026-09-11T02:00:00Z'})}},setInterval:()=>1,clearInterval:()=>{},CustomEvent:class{constructor(type,init={}){this.type=type;this.detail=init.detail}}};
sandbox.window=sandbox;
sandbox.addEventListener=()=>{};
sandbox.dispatchEvent=()=>true;
const ctx=vm.createContext(sandbox);
vm.runInContext("window.DOMSRuntimeConfig=Object.freeze({brokerUrl:'https://broker.example.test'});",ctx);
vm.runInContext(fs.readFileSync('dom-visitors-client.js','utf8'),ctx,{filename:'dom-visitors-client.js'});
const value=code=>vm.runInContext(code,ctx);

const a=value('DOMVisitorClient.visitorId()');
const b=value('DOMVisitorClient.visitorId()');
assert.equal(a,b,'blocked localStorage must keep one in-memory visitor id per page session');
assert(/^v_[A-Za-z0-9_-]+$/.test(a));
assert.equal(value('DOMVisitorClient.resolveBase()'),'https://broker.example.test');

(async()=>{
  await value('DOMVisitorClient.heartbeat()');
  assert.equal(postCount,1);
  assert.equal(lastBody.visitorId,a);
  assert.equal(lastBody.page,'/index.html');
  const state=value('DOMVisitorClient.state()');
  assert.equal(state.totalVisitors,12);
  assert.equal(state.liveNow,3);
  assert.equal(state.error,null);
  console.log('D.O.M. shared visitor client execution PASS');
})().catch(err=>{console.error(err);process.exitCode=1});
