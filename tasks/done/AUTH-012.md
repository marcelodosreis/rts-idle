# AUTH-012 — Order queue authority

**Status:** done

## Task

- Objective: route order queue mutation through canonical queue helpers.
- Scope: commands, economy, combat, death, orders system.
- Non-goals: adding new order kinds.

## Read first

`packages/simulation/src/orders/order-queue.ts`, all command handlers, order/economy systems, order tests.

## Contract

No empty `Orders` component persists; front replacement/removal and clearing use the central APIs.

## Tests and validation

`pnpm run test:orders`; `pnpm run test:simulation`; `pnpm run test:determinism`; `pnpm run typecheck`; `pnpm run lint`; `git diff --check`.

## Acceptance and stop conditions

- [ ] Queue mutations are helper-owned and last-order removal clears the component.

## Completion report

Report PASS/BLOCKED, queue audit, tests, and changed files.
