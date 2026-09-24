import Link from "next/link";

const plans = [
  {
    name: "Explorer",
    price: "₹0",
    cadence: "Free to start",
    summary: "For building a clear picture of what you already hold.",
    features: ["Add and manage your rewards wallet", "Verified route reference for supported cards", "Redemption value calculator", "Live cash-fare comparison when available"],
    action: "Start free",
    href: "/login",
    tone: "pricingFree"
  },
  {
    name: "PointPilot Plus",
    price: "₹999",
    cadence: "per year · inclusive of GST",
    summary: "For travellers who want their points to lead every trip decision.",
    features: ["Everything in Explorer", "Full card-rule intelligence for supported cards", "Saved trip briefs and route shortlists", "Priority access to new optimisation tools"],
    action: "Opening soon",
    href: "#availability",
    tone: "pricingFeatured",
    flag: "THE SMART START"
  },
  {
    name: "PointPilot Pro",
    price: "₹2,499",
    cadence: "per year · inclusive of GST",
    summary: "For people managing multiple cards, programmes and travel goals.",
    features: ["Everything in Plus", "Advanced multi-card optimisation", "Transfer and redemption watchlists", "Early access to new intelligence features"],
    action: "Opening soon",
    href: "#availability",
    tone: "pricingPro"
  }
];

export default function PricingPage(){
  return <main className="page pricingPage">
    <nav className="nav pricingNav">
      <Link className="brand" href="/">Point<span>Pilot</span></Link>
      <div className="pricingNavLinks"><Link href="/">How it works</Link><Link href="/cards">India 30</Link><Link className="linkBtn" href="/login">Sign in</Link></div>
    </nav>

    <section className="pricingHero">
      <div className="eyebrow">POINTPILOT MEMBERSHIP</div>
      <p className="pricingKicker">Simple access. Serious reward intelligence.</p>
      <h1>Keep more value<br/><em>in your wallet.</em></h1>
      <p>Start free, then step up when PointPilot can help you make more confident decisions with the cards and points you already own.</p>
      <div className="pricingSignal"><span>✦</span> Every recommendation keeps its rules, caps, taxes and source context visible.</div>
    </section>

    <section className="pricingGrid" aria-label="PointPilot plans">
      {plans.map(plan => <article className={"pricingCard "+plan.tone} key={plan.name}>
        {plan.flag && <div className="pricingFlag">{plan.flag}</div>}
        <div className="pricingCardTop"><span>{plan.name}</span><small>{plan.cadence}</small></div>
        <strong className="pricingPrice">{plan.price}</strong>
        <p>{plan.summary}</p>
        <ul>{plan.features.map(feature => <li key={feature}><i>✓</i>{feature}</li>)}</ul>
        <a className={"pricingAction "+(plan.tone === "pricingFeatured" ? "pricingActionPrimary" : "")} href={plan.href}>{plan.action} <span>→</span></a>
      </article>)}
    </section>

    <section className="pricingPrinciples">
      <div><span>01</span><h2>No dark patterns.</h2><p>No surprise renewal terms, no hidden taxes and no “guaranteed” travel claims.</p></div>
      <div><span>02</span><h2>Pay for outcomes.</h2><p>We will not price the product around arbitrary searches or pretend unavailable data is live.</p></div>
      <div><span>03</span><h2>Earn trust first.</h2><p>Hotel integration and personal strategy sessions will appear only when they are ready to be delivered well.</p></div>
    </section>

    <section className="availability" id="availability">
      <div><span className="pill cyan">MEMBERSHIP AVAILABILITY</span><h2>Explorer is live.<br/>Plus and Pro are next.</h2><p>Paid membership will open after secure payments and the promised features are ready. Until then, you can build your wallet and explore the live experience for free.</p></div>
      <Link className="availabilityBtn" href="/login">Build your free wallet <span>↗</span></Link>
    </section>

    <footer>PointPilot · Rewards intelligence built for India</footer>
  </main>
}
