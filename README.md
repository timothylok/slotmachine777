# 🎰 Lucky Sevens

A free, open-source slot machine for the browser. Five reels, three rows, five
paylines, scatter-triggered free spins, and a paytable tuned by simulation to a
~95% return to player. Play money only — nothing can be bought, cashed out or
wagered.

Built with Next.js (App Router) + TypeScript, and deployable to Vercel with no
configuration. Player accounts are handled by Supabase, with a guest mode that
works without any backend at all.

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Ftimothylok%2Fslotmachine777&env=NEXT_PUBLIC_SUPABASE_URL,NEXT_PUBLIC_SUPABASE_ANON_KEY&envDescription=Supabase%20project%20URL%20and%20anon%20key%20-%20leave%20blank%20to%20run%20in%20guest-only%20mode&envLink=https%3A%2F%2Fgithub.com%2Ftimothylok%2Fslotmachine777%23accounts-supabase)

> The two environment variables are optional. Deploy without them and the game
> runs in guest-only mode; add them later and sign-in switches on.

## Features

- **5×3 reels, 5 paylines**, weighted per-reel strips (later reels carry fewer
  high-value symbols, which is what keeps the maths honest)
- **Scatter bonus** — 3/4/5 scatters anywhere pay and award 5/10/15 free spins,
  which then play themselves
- **Simulated RTP** — `npm run rtp` Monte-Carlos the paytable; the current
  numbers land at ~86% base, ~97% including free spins
- **Accounts via Supabase** — email + password, magic link, password reset,
  email confirmation, and cross-device progress
- **Guest mode** — one click, no account; progress is kept in `localStorage`
  and carried over if the guest later creates an account
- **No binary assets** — symbols are emoji, sounds are synthesised with the Web
  Audio API, so there is nothing to license and nothing to download
- Keyboard (`Space` to spin), autoplay, mute, a full in-game paytable, reduced
  motion support and a layout that works down to phone width

## Quick start

```bash
npm install
cp .env.example .env.local   # optional — see "Accounts" below
npm run dev                  # http://localhost:3000
```

Without Supabase credentials the app boots straight into guest mode. That is
deliberate: the game is fully playable before any backend exists.

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Development server |
| `npm run build` | Production build |
| `npm test` | Unit tests (Vitest) |
| `npm run test:watch` | Tests in watch mode |
| `npm run rtp` | Monte-Carlo the paytable and print RTP / hit rate |
| `npm run lint` | ESLint |

## Accounts (Supabase)

1. Create a project at [supabase.com](https://supabase.com).
2. Run `supabase/migrations/0001_slot_profiles.sql` in the SQL editor. It
   creates the `slot_profiles` table and enables row-level security so a player
   can only ever read and write their own row.

   The table is namespaced `slot_profiles`, and the migration installs no
   trigger on `auth.users`, so it is safe to run on a project that already hosts
   other applications. The client upserts a player's row on first save, which is
   what makes a sign-up trigger unnecessary.
3. Copy **Project Settings → API** into `.env.local`:

   ```
   NEXT_PUBLIC_SUPABASE_URL=https://<project>.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon key>
   ```

   Both are browser-safe; RLS is what protects the data.
4. In **Authentication → URL Configuration**, add `<your-domain>/auth/callback`
   as a redirect URL (and `http://localhost:3000/auth/callback` for local work).

`src/proxy.ts` refreshes the auth cookie on every request, `src/app/auth/callback`
exchanges the one-time code from confirmation, magic-link and reset emails, and
`PlayerProvider` merges guest progress into a brand-new account on first sign-in.

### Guest mode

Guests are a first-class path, not a degraded one. "Play as guest" stores a flag
in `localStorage` and keeps credits there. If that guest later signs up, their
credits, best win and spin count move to the account — unless the account has
already been played on, in which case the account wins and only the best win is
carried across. That rule lives in `mergeStates()` and is covered by tests.

## Deploying to Vercel

```bash
npm i -g vercel
vercel                                    # preview
vercel env add NEXT_PUBLIC_SUPABASE_URL
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY
vercel --prod
```

Or import the repo at [vercel.com/new](https://vercel.com/new) and add the same
two environment variables. No `vercel.json` is needed — the framework is
detected automatically. Remember to add the deployed origin to Supabase's
redirect URLs.

## Project layout

```
src/
  app/
    auth/callback/route.ts   one-time code → session exchange
    page.tsx                 provider + gate + machine
  components/
    SlotMachine.tsx          game loop, meters, controls
    Reel.tsx                 controlled strip animation
    Paytable.tsx             in-game paytable and payline maps
    PlayerProvider.tsx       auth + persisted game state
    AuthGate.tsx             sign in / sign up / magic link / guest
    AccountChip.tsx          who is playing
  lib/
    slot.ts                  reels, paytable, RNG, win evaluation (pure)
    gameState.ts             save-state shape, sanitising, guest→account merge
    profileStore.ts          localStorage and Supabase backends
    authErrors.ts            Supabase error strings → player-readable text
    sound.ts                 Web Audio synthesis
    supabase/                browser + server clients, config guard, types
supabase/migrations/         SQL for the slot_profiles table and RLS
scripts/rtp.mts              RTP simulation
```

## How the maths works

Each reel has its own strip; a symbol's frequency on that strip *is* its
probability. A spin picks a stop index per reel with `crypto.getRandomValues`,
the three visible symbols come from that index, and each payline is scored
left-to-right from reel 1. Scatters ignore paylines and pay from anywhere.

`npm run rtp` exists so the paytable can be retuned with evidence rather than
guesswork — change a number in `PAYTABLE` and re-run it. A test also asserts the
effective RTP stays inside 90–100%, so an accidental edit that makes the game
unwinnable (or infinitely profitable) fails CI.

## Responsible play

This is a toy with no real money, no purchases and no cash-out. If gambling is
affecting you or someone you know, see
[BeGambleAware](https://www.begambleaware.org/).

## Licence

MIT — see [LICENSE](./LICENSE).
