"use client";
import Link from "next/link";
import {useMemo,useState} from "react";
import {CARD_CATALOG_REVIEWED_AT,TOP_CARDS} from "../../lib/card-catalog.js";

export default function CardsPage(){
 const[q,setQ]=useState(""),[tier,setTier]=useState("All");
 const tiers=["All",...new Set(TOP_CARDS.map(x=>x.tier))];
 const cards=useMemo(()=>TOP_CARDS.filter(c=>(tier==="All"||c.tier===tier)&&(`${c.name} ${c.issuer} ${c.bestFor.join(" ")}`.toLowerCase().includes(q.toLowerCase()))),[q,tier]);
 return <main className="catalogPage"><nav className="nav publicNav"><Link href="/" className="brand">Point<span>Pilot</span></Link><div><Link href="/pricing">Pricing</Link><Link className="navCta" href="/login">Open wallet</Link></div></nav>
 <header className="catalogHero"><div className="eyebrow">POINTPILOT INDIA 30 • REVIEWED {CARD_CATALOG_REVIEWED_AT}</div><h1>Find the card that earns its place.</h1><p>An editorial shortlist built around reward utility—not affiliate payouts. Ranking is a starting point; your spend pattern decides the winner.</p><div className="catalogStats"><span><b>30</b> cards</span><span><b>17</b> use cases</span><span><b>0</b> paid placements</span></div></header>
 <section className="catalogTools"><input aria-label="Search cards" placeholder="Search card, issuer or use case" value={q} onChange={e=>setQ(e.target.value)}/><select aria-label="Filter tier" value={tier} onChange={e=>setTier(e.target.value)}>{tiers.map(x=><option key={x}>{x}</option>)}</select></section>
 <section className="catalogList">{cards.map(card=><article key={card.rank}><div className="catalogRank">{String(card.rank).padStart(2,"0")}</div><div className="catalogIdentity"><small>{card.issuer}</small><h2>{card.name}</h2><div>{card.bestFor.map(x=><span key={x}>{x}</span>)}</div></div><div className="catalogEarn"><small>REWARD POSITIONING</small><p>{card.earn}</p></div><div className="catalogFacts"><span>{card.fee===0?"Lifetime-free positioning":`₹${card.fee.toLocaleString("en-IN")} annual fee`}</span><span>{card.forex==null?"Check forex terms":`${card.forex}% forex markup`}</span></div><div className="catalogScore"><strong>{card.score}</strong><span>editorial score</span><a href={card.source} target="_blank" rel="noreferrer">Issuer source ↗</a></div></article>)}</section>
 <div className="catalogDisclaimer">Ranking methodology weighs reward usefulness, transfer options, fees, forex cost and category fit. Terms can change after review; always confirm the linked issuer page before applying or spending.</div></main>
}
