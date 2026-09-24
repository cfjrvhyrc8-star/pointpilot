import fs from "node:fs";
import {createRequire} from "node:module";
import {TOP_CARDS,rankForSpend} from "../lib/card-catalog.js";
const require=createRequire(import.meta.url);
const parser=require("next/dist/compiled/babel/parser");

const files=["app/page.js","app/login/page.js","app/cards/page.js","app/pricing/page.js","app/dashboard/page.js","app/dashboard/SpendSmart.js","app/dashboard/BestUseSection.js","app/api/optimize/route.js","lib/card-catalog.js","lib/travel-provider.js"];
for(const file of files)parser.parse(fs.readFileSync(file,"utf8"),{sourceType:"module",plugins:["jsx"]});
if(TOP_CARDS.length!==30||new Set(TOP_CARDS.map(x=>`${x.issuer}|${x.name}`)).size!==30)throw new Error("The India catalogue must contain 30 unique cards.");
for(const category of ["travel","dining","online","utilities","international","general"]){
 const rows=rankForSpend({category,amount:25000,ownedNames:["Diners Club Black Metal","Amazon Pay"]});
 if(rows.length!==30||rows.some((row,index)=>index&&rows[index-1].fit<row.fit))throw new Error(`Invalid ${category} ranking.`);
}
console.log(`Validated ${files.length} modules, ${TOP_CARDS.length} cards and 6 spend scenarios.`);
