import fs from "node:fs";
import "./test-transfer-limits.mjs";
import "./test-flight-benchmark.mjs";
import "./test-funding-status.mjs";
import "./test-booking-checklist.mjs";
import "./test-booking-decision.mjs";
import {createRequire} from "node:module";
import {TOP_CARDS,rankForSpend} from "../lib/card-catalog.js";
import {AIRLINE_PROGRAMS} from "../lib/airline-programs.js";
import {buildAwardFunding,buildDirectRedemptions,buildGoalPace,cardMatchesRewardRule,transferRatioText} from "../lib/reward-planner.js";
const require=createRequire(import.meta.url);
const parser=require("next/dist/compiled/babel/parser");

const files=["app/page.js","app/login/page.js","app/cards/page.js","app/pricing/page.js","app/dashboard/page.js","app/dashboard/ActionCentre.js","app/dashboard/SpendSmart.js","app/dashboard/BestUseSection.js","app/dashboard/AirlineMiles.js","app/dashboard/TripGoal.js","app/dashboard/BookingComparison.js","app/dashboard/PersonalValue.js","lib/booking-decision.js","app/api/optimize/route.js","lib/card-catalog.js","lib/airline-programs.js","lib/reward-planner.js","lib/travel-provider.js"];
files.push("app/dashboard/BookingChecklist.js","lib/booking-checklist.js");
for(const file of files)parser.parse(fs.readFileSync(file,"utf8"),{sourceType:"module",plugins:["jsx"]});
if(TOP_CARDS.length!==30||new Set(TOP_CARDS.map(x=>`${x.issuer}|${x.name}`)).size!==30)throw new Error("The India catalogue must contain 30 unique cards.");
if(AIRLINE_PROGRAMS.length!==12||new Set(AIRLINE_PROGRAMS.map(x=>x.code)).size!==12||AIRLINE_PROGRAMS.some(x=>!x.source_url||!x.award_search_url))throw new Error("The airline programme directory must contain 12 sourced programmes.");
for(const category of ["travel","dining","online","utilities","international","general"]){
 const rows=rankForSpend({category,amount:25000,ownedNames:["Diners Club Black Metal","Amazon Pay"]});
 if(rows.length!==30||rows.some((row,index)=>index&&rows[index-1].fit<row.fit))throw new Error(`Invalid ${category} ranking.`);
}
const sampleWallet=[{card_name:"Diners Club Black Metal",points:75000}];
const sampleRules=[{card_name:"Diners Club Black Metal",partner:"SmartBuy",partner_type:"direct_travel",redemption_value:1,max_booking_coverage:.7},{card_name:"Diners Club Black Metal",partner:"Air India Maharaja Club",partner_type:"airline_transfer",transfer_ratio:1}];
const direct=buildDirectRedemptions(sampleWallet,sampleRules,100000)[0];
if(direct.value!==70000||direct.pointsUsed!==70000||direct.cashRemaining!==30000)throw new Error("Direct redemption caps are not being applied correctly.");
const award=buildAwardFunding({wallet:sampleWallet,rules:sampleRules,balances:[{program_code:"air-india-maharaja",miles:10000}],programCode:"air-india-maharaja",milesRequired:50000,cashFare:90000,taxes:10000});
if(award.shortfall!==0||award.plannedTransfer!==40000||award.valuePerMile!==1.6)throw new Error("Award funding plan is incorrect.");
const pace=buildGoalPace({travelDate:"2027-04-05",shortfall:30000,transferRatio:1,asOf:new Date("2027-01-05T12:00:00Z").getTime()});
if(pace.monthsRemaining!==3||pace.milesPerMonth!==10000||pace.pointsPerMonth!==10000||pace.status!=="building")throw new Error("Trip funding pace is incorrect.");
const duplicate=buildAwardFunding({wallet:sampleWallet,rules:[...sampleRules,sampleRules[1]],balances:[],programCode:"air-india-maharaja",milesRequired:100000});
if(duplicate.plannedTransfer!==75000||duplicate.shortfall!==25000)throw new Error("Duplicate routes must not create additional points.");
const voucher=buildDirectRedemptions([{card_name:"Platinum Travel",points:40000}],[{card_name:"Platinum Travel",partner_type:"voucher",redemption_value:.3,min_redeem_points:20000,redeem_increment:20000}],1000)[0];
if(voucher.pointsUsed!==20000||voucher.value!==1000||voucher.rate!==.05)throw new Error("Voucher blocks must preserve actual points consumed and effective value.");
if(cardMatchesRewardRule("",sampleRules[0])||transferRatioText(.1)!=="1:10")throw new Error("Empty card matching or transfer display is incorrect.");
console.log(`Validated ${files.length} modules, ${TOP_CARDS.length} cards, ${AIRLINE_PROGRAMS.length} airline programmes, 6 spend scenarios and the redemption planner.`);
