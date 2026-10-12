import assert from 'node:assert/strict';
import {cardNamesMatch} from '../lib/card-identity.js';
import {buildDirectRedemptions,buildAwardFunding} from '../lib/reward-planner.js';
for(const [a,b] of [['Amex Platinum Travel','Platinum Travel'],['ICICI Times Black Metal','Times Black'],['Scapia Federal Credit Card','Scapia'],['One Credit Card','OneCard'],['HDFC Diners Club Black Metal Edition','Diners Black Metal']]){
 assert.equal(cardNamesMatch(a,b),true);assert.equal(cardNamesMatch(b,a),true);
}
for(const [a,b] of [['Diners Black','Diners Black Metal'],['Amex Platinum','Platinum Travel'],['Axis Magnus','Axis Magnus Burgundy'],['Regalia','Regalia Gold'],['',''],['Black','Diners Black Metal']])assert.equal(cardNamesMatch(a,b),false);
const wallet=[{card_name:'Diners Black',points:50000}];
const rule={card_name:'Diners Black Metal',partner:'Air India Maharaja Club',partner_type:'airline_transfer',transfer_ratio:1};
assert.equal(buildAwardFunding({wallet,rules:[rule],balances:[],programCode:'air-india-maharaja',milesRequired:10000}).plannedTransfer,0);
assert.equal(buildDirectRedemptions(wallet,[{...rule,partner_type:'direct_travel',redemption_value:1}],10000).length,0);
console.log('Card identity: 18 checks passed.');
