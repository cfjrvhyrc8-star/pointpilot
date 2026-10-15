import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {repriceDirectRoute,directBreakEven,validRedemptionAllowance} from '../lib/booking-quote.js';
import {buildBookingDecision} from '../lib/booking-decision.js';
const original={card:{card_name:'Diners Black Metal',points:75000},rule:{card_name:'Diners Black Metal',partner:'Flight portal',partner_type:'direct_travel',route_status:'verified',redemption_value:1,max_booking_coverage:0.7}};
const before=JSON.stringify(original);
let route=repriceDirectRoute(original,100000);
assert.equal(route.pointsUsed,70000);
assert.equal(route.cashRemaining,30000);
route=repriceDirectRoute(original,120000);
assert.equal(route.pointsUsed,75000);
assert.equal(route.cashRemaining,45000);
const compare=direct=>buildBookingDecision({cashFare:100000,taxes:0,direct,extraFees:{direct:500},award:{target:0,routes:[],shortfall:0}});
assert.equal(directBreakEven(compare(route)).saving,54500);
assert.equal(directBreakEven(compare(route)).perPoint,54500/75000);
assert.ok(directBreakEven(compare(repriceDirectRoute(original,200000))).saving<0);
assert.equal(compare(repriceDirectRoute(original,200000)).lowest.kind,'cash');
for(const bad of [null,undefined,'', ' ',0,-1,'abc',Infinity])assert.equal(repriceDirectRoute(original,bad),null);
assert.equal(repriceDirectRoute(null,1000),null);
assert.equal(directBreakEven(null),null);
assert.equal(directBreakEven(compare(null)),null);
assert.equal(JSON.stringify(original),before);
const voucher={card:{card_name:'Test',points:40000},rule:{card_name:'Test',partner_type:'voucher',redemption_value:0.3,min_redeem_points:20000,redeem_increment:20000}};
assert.equal(repriceDirectRoute(voucher,1000).pointsUsed,20000);
assert.equal(repriceDirectRoute(voucher,1000).cashRemaining,0);
console.log('Booking quotes: 22 checks passed.');
const limited=repriceDirectRoute(original,100000,25000);
assert.equal(limited.pointsUsed,25000);
assert.equal(limited.cashRemaining,75000);
assert.equal(limited.card,original.card);
assert.equal(repriceDirectRoute(original,100000,0),null);
assert.equal(repriceDirectRoute(original,100000,999999).pointsUsed,70000);
const capped={...original,rule:{...original.rule,max_redeem_points:10000}};
assert.equal(repriceDirectRoute(capped,100000,25000).pointsUsed,10000);
assert.equal(repriceDirectRoute(voucher,1000,19000),null);
assert.equal(repriceDirectRoute(voucher,1000,20000).pointsUsed,20000);
for(const invalid of ['', ' ',null,-1,0.5,Infinity,false,'abc']){
 assert.equal(validRedemptionAllowance(invalid),false);
 assert.equal(repriceDirectRoute(original,100000,invalid),null);
}
assert.equal(validRedemptionAllowance('0'),true);
assert.equal(JSON.stringify(original),before);
assert.equal(compare(repriceDirectRoute(original,100000,0)).lowest.kind,'cash');
console.log('Remaining redemption allowance: 27 checks passed.');

// Exercise the component's actual scenario key expressions to prevent stale fees.
const component=readFileSync(new URL('../app/dashboard/BookingComparison.js',import.meta.url),'utf8');
const quoteExpression=component.match(/const quoteKey=(.*);/)[1];
const feeExpression=component.match(/const feeKey=(.*);/)[1];
const scenarioKey=new Function('cashFare','taxes','award','selectedRoute','portal','allowance',`const quoteKey=${quoteExpression};return ${feeExpression};`);
const scenario=[100000,5000,{target:45000,program:{code:'test'},routes:[]},original,{enabled:false,fare:''},{enabled:false,points:''}];
const key=scenarioKey(...scenario);
const saved={[key]:{cash:100,direct:200,award:300,transfer:400}};
assert.equal(saved[scenarioKey(...structuredClone(scenario))].direct,200);
for(const [index,value] of [[0,110000],[1,6000],[2,{...scenario[2],target:50000}],[2,{...scenario[2],program:{code:'other'}}],[3,{...original,card:{...original.card,points:60000}}],[4,{enabled:true,fare:'120000'}],[5,{enabled:true,points:'25000'}]]){
 const changed=structuredClone(scenario);changed[index]=value;
 assert.equal(saved[scenarioKey(...changed)],undefined,'Changed quote must not inherit fees');
}
console.log('Booking fee scenario isolation: 8 checks passed.');
