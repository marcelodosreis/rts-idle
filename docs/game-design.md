# Game Design — RTS Idle

> Core philosophy: **an extremely responsive competitive RTS with simple aesthetics — and a simulation engine engineered far above the size of the game.**

This document records design commitments, not implementation. Numbers that gate design (match length, levers) are targets to author; tuning details live in `docs/master-plan.md` §11–14 and in `packages/game-data`.

## The five pillars

The game works if these five are true. Everything else is negotiable.

1. **Excellent control** — the army does exactly what the player ordered. Click → response feels instant; movement, groups, and focus fire behave.
2. **Readable combat** — the player immediately understands what happened: who is fighting, what died, what damaged what. No ambiguity, no surprise damage.
3. **Real strategy** — several valid decisions exist at each moment; scouting and information matter; losing feels like a bad decision, not a coin flip.
4. **Short matches** — 10–20 minutes for a full match.
5. **Fast rematch** — ending a match leads to "one more" in seconds. No friction between matches.

The retention loop that matters:

```
open → play → lose → "one more" → play → win → "one more"
```

The first commercial goal is making someone play a second match, then a third, then return tomorrow. Only after retention is proven does monetization make sense.

## Match length (10–20 min)

Match length is a **consequence** of several systems, not a settable number. The levers that author duration:

- **Economy ramp** — collection rates, cargo size, build times, cost curves. Faster ramp = shorter matches.
- **Map scale** — travel distances, expansion positions, choke placement.
- **Supply cap** — total army size bounds stalemate potential.
- **Combat decisiveness** — damage/armor curves and unit durability determine how long a fight resolves.
- **Timeout rule** — the simulated `45 min` cap is a safety valve, not a target; real matches should resolve well before it.

Each of these must be authored so a typical match lands in the 10–20 minute band, and that target is validated by headless simulation (`simulate` / `balance`) before the M1 gate.

## Readable combat

- Damage is visible and attributable: clear hit feedback, visible deaths, no damage from nowhere.
- Silhouettes and faction colors make units distinguishable at a glance; color is never the only differentiator (accessibility).
- Targeting priority and pursuit rules are predictable to the player.
- Fog of war explains exactly what is known and what is not; hidden information never produces confusing events (see `docs/master-plan.md` §16.3).
- A spectator/observer should be able to reconstruct what happened from the replay alone.

## Copy the function, not the complexity

A mechanic is adopted only when it creates decision, counterplay, or skill expression — not because a famous RTS has it. If a mechanic only adds buttons, it is out. When a reference game's mechanic produces a valuable outcome, design our own mechanic that produces the same *function* with our own identity.

## Monetization stance

- **Never monetize power.** The competitive core stays clean.
- Future candidates, in order of naturalness: cosmetics, skins, thematic maps, effects, visual commanders, banners, announcers, customization.
- All of it is **after** proving retention. Monetization is not part of the current execution (see `docs/master-plan.md` §2.4).

## Aesthetic stance

The visual identity uses **real RTS sprites and a tileset** (ADR-015, supersedes
ADR-005), adopted only after license validation. Art is data-driven in
game-data (ADR-004): swapping packs is a data change. The budget saved by not
hand-crafting assets is reinvested in responsiveness and legibility, which are
the product. The assets exist to make combat readable, not to compete on raw
visual fidelity.

## Design principles

- **The computer must never feel unfair.** Bad outcomes trace to decisions.
- **Information is a resource.** Scouting is meaningfully rewarded; fog is real, not cosmetic.
- **Determinism is a feature.** The same seed + commands reproduce the same match — enabling exact analysis of any outcome.
- **Content is data.** Balance and content iterate via declarative data and headless validation (ADR-004), never by silent code changes "to make it more fun" (`docs/master-plan.md` §13).

## Playable releases (constant updates)

- Every playable increment ships as a testable release: a tag + build, no other ceremony.
- No fixed dates — a release happens whenever a slice is playable: each deepening pass, then M1/M2.
- Releases never block development flow; they are snapshots of the working tree at a playable state.
- Ugly is fine; a release only needs to be playable and reproducible.
- This keeps the project in constant feedback: the core question "do I want to play another match?" is answered at every step, not only at launch.