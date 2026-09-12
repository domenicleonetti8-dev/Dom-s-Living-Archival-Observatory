'use strict';
const fs=require('fs');
const assert=require('assert');

function annualized(loss,years){const l=Number(loss),y=Number(years);if(!Number.isFinite(l)||!Number.isFinite(y)||l<0||l>=100||y<=0)return null;return 100*(1-Math.pow(1-l/100,1/y))}
function reconstruct(rate,years){return 100*(1-Math.pow(1-Number(rate)/100,Number(years)))}
function percentOfArea(loss,area){const l=Number(loss),a=Number(area);return Number.isFinite(l)&&Number.isFinite(a)&&l>=0&&a>0?l/a*100:null}

let seed=0x5eeda11;
function rnd(){seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/0x100000000}

let checks=0;
for(let i=0;i<50000;i++){
  const loss=rnd()*99.5;
  const years=0.25+rnd()*150;
  const rate=annualized(loss,years);
  assert(Number.isFinite(rate)); checks++;
  assert(rate>=0&&rate<100); checks++;
  const rebuilt=reconstruct(rate,years);
  const tol=1e-9*Math.max(1,loss);
  assert(Math.abs(rebuilt-loss)<=tol,`round-trip drift loss=${loss} years=${years} rebuilt=${rebuilt}`); checks++;
  const area=.001+rnd()*100000;
  const areaLoss=rnd()*area;
  const pct=percentOfArea(areaLoss,area);
  assert(Number.isFinite(pct)&&pct>=0&&pct<=100); checks++;
}

assert.strictEqual(annualized(-1,10),null);checks++;
assert.strictEqual(annualized(100,10),null);checks++;
assert.strictEqual(annualized(10,0),null);checks++;
assert.strictEqual(percentOfArea(1,0),null);checks++;

const vitals=fs.readFileSync('dom-earth-vitals.js','utf8');
assert(!/trendMmPerYear\s*:\s*3\.3/.test(vitals),'hard-coded sea-level fallback reintroduced');checks++;
assert(!/uncertaintyMmPerYear\s*:\s*0\.4/.test(vitals),'hard-coded sea-level uncertainty fallback reintroduced');checks++;
assert(vitals.includes('same-origin-authoritative-snapshot'),'authoritative snapshot fallback missing');checks++;
assert(vitals.includes("status:'unavailable'"),'failed live source must become unavailable');checks++;
assert(vitals.includes("dataClass:'published-reference'"),'historical ecosystem values must be labeled reference');checks++;

const sidebar=fs.readFileSync('dom-planet-health-sidebar.js','utf8');
assert(sidebar.includes('NOT ASSESSED'),'health gauge must distinguish not assessed from 0%');checks++;
assert(!sidebar.includes('uncertaintyMmPerYear||0'),'missing uncertainty must never render as ±0');checks++;

const updater=fs.readFileSync('tools/update_authoritative_vitals.py','utf8');
assert(updater.includes('No numeric fallback constants'),'snapshot generator truth policy missing');checks++;
assert(!/trendMmPerYear[^\n]*3\.3/.test(updater),'snapshot generator contains sea-level fallback constant');checks++;

console.log(`DOM_AUTHORITATIVE_VITALS_TRUTH=PASS cases=50000 checks=${checks}`);
