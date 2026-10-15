import assert from 'node:assert/strict';
import fs from 'node:fs';
import {evaluateAwardQuote} from '../lib/award-quote.js';
const source=fs.readFileSync(new URL('../app/dashboard/BestUseSection.js',import.meta.url),'utf8');
assert.match(source,/cashFare:"",taxes:"",milesRequired:""/);
assert.match(source,/const quote=evaluateAwardQuote\(target\)/);
assert.match(source,/!quote.complete\?/);
const gate=source.indexOf('{!quote.complete?');
for(const marker of ['<BookingComparison','className="deploymentGrid"','className="routeWorkbench"'])assert.ok(source.indexOf(marker)>gate);
const complete={cashFare:'75000',taxes:'8500',milesRequired:'45000'};
assert.equal(evaluateAwardQuote(complete).complete,true);
for(const key of Object.keys(complete)){
  for(const value of ['', ' ', null, undefined, 'abc'])assert.equal(evaluateAwardQuote({...complete,[key]:value}).complete,false);
}
assert.equal(evaluateAwardQuote({...complete,taxes:'0'}).complete,true);
assert.ok(evaluateAwardQuote({...complete,taxes:'80000'}).perMile<0);
assert.equal(evaluateAwardQuote({...complete,milesRequired:'1.5'}).complete,false);
console.log('Deployment quote: blank defaults, result gate, invalid inputs, explicit zero and negative value checked.');
