---
status: closed
classe: presentation
barreira: null
regressao:
  - tests/e2e/economy-playable.spec.ts
---

# Economy Loop Lacked Visible Feedback

## Summary

VS-01B exposed the authoritative gather loop in the browser, but the Worker looked like a unit executing a normal move. The player could not see mining progress, carried cargo, or the return phase even though the simulation completed the loop correctly.

## Symptom

After right-clicking a Mineral Node, the Worker walked to it but appeared idle while gathering and used its normal run animation while returning. No progress or cargo indicator explained the pause or the return trip.

## Root cause

The server snapshot projected only the generic unit `orderState`. Gather phase, progress, cargo, capacity, and target node remained inside the authoritative simulation and were unavailable to the renderer and HUD.

## What we missed

The original E2E asserted movement, wallet deposit, repetition, and STOP, but did not assert that mining and carrying were visibly distinguishable. The playable acceptance criteria therefore allowed a mechanically correct but unreadable interaction.

## Fix

The snapshot now projects optional economy presentation state. The renderer uses the existing pickaxe and gold-carrying Pawn animations, draws a contextual progress/cargo bar, and highlights the active Mineral Node. The selection HUD displays the current economy phase and values.

## Regression

`tests/e2e/economy-playable.spec.ts` performs the real selection and right-click interaction, then requires visible Mining and Returning states plus the corresponding gather and carry animations before accepting the deposit and STOP behavior.

## Prevention

The VS-01B task packet and manual smoke checklist now require distinct mining/carrying feedback and progress visibility. Future playable feature acceptance must assert player-visible state, not only authoritative outcomes.

## Verification

Run the focused protocol/session tests, `pnpm run verify`, and the focused Chromium economy E2E listed in the VS-01B task packet.
