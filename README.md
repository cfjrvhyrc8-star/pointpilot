# PointPilot Production

Next.js, Supabase Auth/Postgres and server-side Travelport integration for an
India-first credit-card rewards wallet.

## Product surfaces

- Secure magic-link and Facebook sign-in.
- Personal wallet protected by owner-only RLS.
- Verified redemption-route optimizer with booking caps.
- Spend Smart wallet ranking across six purchase scenarios.
- Public, source-linked PointPilot India 30 card catalogue.
- Travelport flight cash-fare search with retries and explicit cash/award labels.
- Travelport Stays remains gated until the account is provisioned.

## Setup

1. Use Node 20 or 22 and run `npm ci`.
2. Create/link the Supabase project and apply `supabase/schema.sql`.
3. Configure the variables documented in `.env.example` in Vercel.
4. Keep `TRAVELPORT_ENV=pre-production` until Travelport issues production credentials.
5. Run `npm run validate` and `npm run build` before deployment.
