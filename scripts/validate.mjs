import fs from "node:fs";
import {createRequire} from "node:module";
import {TOP_CARDS,rankForSpend} from "../lib/card-catalog.js";
import {AIRLINE_PROGRAMS} from "../lib/airline-programs.js";
const require=createRequire(import.meta.url);
const parser=require("next/dist/compiled/babel/parser");

const files=["app/page.js","app/login/page.js","app/cards/page.js","app/pricing/page.js","app/dashboard/page.js","app/dashboard/SpendSmart.js","app/dashboard/BestUseSection.js","app/dashboard/AirlineMiles.js","app/api/optimize/route.js","lib/card-catalog.js","lib/airline-programs.js","lib/travel-provider.js"];
for(const file of files)parser.parse(fs.readFileSync(file,"utf8"),{sourceType:"module",plugins:["jsx"]});
if(TOP_CARDS.length!==30||new Set(TOP_CARDS.map(x=>`${x.issuer}|${x.name}`)).size!==30)throw new Error("The India catalogue must contain 30 unique cards.");
if(AIRLINE_PROGRAMS.length!==12||new Set(AIRLINE_PROGRAMS.map(x=>x.code)).size!==12||AIRLINE_PROGRAMS.some(x=>!x.source_url||!x.award_search_url))throw new Error("The airline programme directory must contain 12 sourced programmes.");
for(const category of ["travel","dining","online","utilities","international","general"]){
 const rows=rankForSpend({category,amount:25000,ownedNames:["Diners Club Black Metal","Amazon Pay"]});
 if(rows.length!==30||rows.some((row,index)=>index&&rows[index-1].fit<row.fit))throw new Error(`Invalid ${category} ranking.`);
}
console.log(`Validated ${files.length} modules, ${TOP_CARDS.length} cards, ${AIRLINE_PROGRAMS.length} airline programmes and 6 spend scenarios.`);
