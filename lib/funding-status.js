export function fundingStatus(award){
 const used=(award.routes||[]).filter(route=>route.contribution>0);
 const needsVerification=used.some(route=>route.limitsStatus!=="verified"||route.rule?.route_status!=="verified"||route.rule?.active===false);
 return {needsVerification,covered:award.target>0&&award.shortfall===0&&!needsVerification,
  coverageLabel:needsVerification?"ratio-only coverage":"modeled coverage",
  transferLabel:needsVerification?"Estimated transfer miles":"Modeled transfer miles",
  warning:needsVerification?"This estimate includes unverified transfer limits. Confirm units, minimums, increments, caps and timing before treating it as funded.":"Funding is modeled, not a confirmed award seat."};
}
