import assert from 'node:assert/strict';
import {tripQuoteFields} from '../lib/award-quote.js';
import {buildAwardFunding} from '../lib/reward-planner.js';
const goal={cash_fare:'75000.50',taxes:'0',miles_required:'45000'};
assert.deepEqual(tripQuoteFields(goal),{cash_fare:75000.5,taxes:0,miles_required:45000});
for(const key of Object.keys(goal))for(const invalid of ['', ' ',null,undefined,-1,Infinity,true])assert.equal(tripQuoteFields({...goal,[key]:invalid}),null);
assert.equal(tripQuoteFields({...goal,miles_required:1.5}),null);
assert.equal(tripQuoteFields({...goal,cash_fare:0}),null);
const base={wallet:[],rules:[],balances:[],programCode:'air-india-maharaja',milesRequired:45000,cashFare:75000,taxes:8500};
assert.equal(buildAwardFunding(base).netCashValue,66500);
for(const taxes of ['',null,undefined]){
 const result=buildAwardFunding({...base,taxes});
 assert.equal(result.valuePerMile,null);
 assert.equal(result.netCashValue,null);
 assert.equal(result.shortfall,45000); // Funding can still be modelled without a fare quote.
}
assert.equal(buildAwardFunding({...base,taxes:0}).netCashValue,75000);
assert.equal(buildAwardFunding({...base,taxes:80000}).netCashValue,-5000);
for(const milesRequired of [Infinity,1.5,true,-1,''])assert.equal(buildAwardFunding({...base,milesRequired}).target,0);
console.log('Trip quote: 41 checks passed.');
