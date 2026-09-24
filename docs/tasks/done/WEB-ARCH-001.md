# WEB-ARCH-001 — Web Frontend Architecture Restructure

## Task

- ID: `WEB-ARCH-001`
- Objective: Replace the current web MPA and screen-centred layout with a high-quality feature-first React SPA, while preserving existing gameplay behaviour.
- Why: `apps/web` currently has a root that renders only `MatchScreen`, no application router, a large session hook that owns unrelated concerns, and an independently bootstrapped Sprite Lab. This makes growth, ownership, testing, and navigation unnecessarily difficult.
- Scope: `apps/web`, browser E2E/unit/architecture tests, web architecture/specification docs, and the deployment route contract.
- Non-goals: No lobby, authentication, gameplay-rule changes, renderer behaviour changes, full visual redesign, production deployment implementation, or legacy technical URL compatibility.

## Decisions locked

- The match remains at `/`; there is no lobby.
- Use `react-router-dom` with `BrowserRouter` and real URLs.
- Laboratory tools share the same React application and are available from a discreet Laboratory menu in the match `TopBar`.
- The former MPA URLs `/sprites/`, `/det.html`, and `/perf.html` are intentionally removed; no redirects are provided.
- Laboratory routes use the `/laboratory` namespace, with `/laboratory` serving the asset browser.
- Each laboratory tool is an independent feature.
- Browser-server transport belongs in `shared/transport`; `shared/ui` contains only UI primitives and reusable application components belong in `shared/components`.
- The frontend follows a feature-first dependency direction:

  ```text
  app -> pages -> features/entities -> shared
  ```

  Higher layers may import lower layers only. Cross-domain imports must use a domain's public API (`index.ts`); deep imports are forbidden.

## Route contract

| Route | Behaviour |
| --- | --- |
| `/` | Starts and renders the current match experience. Query params `scenario`, `aggression`, `sprites`, and `map=local` retain their existing semantics. |
| `/laboratory` | Asset browser. |
| `/laboratory/editor` | Map editor. |
| `/laboratory/diagnostics` | Combined stress, determinism, and renderer performance tools. |
| `/laboratory/report` | Asset validation report. |
| `/laboratory/stress` | Redirects to `/laboratory/diagnostics`. |
| `/laboratory/determinism` | Redirects to `/laboratory/diagnostics`. |
| `/laboratory/performance` | Redirects to `/laboratory/diagnostics`. |
| `*` | Not-found page. |

The match page owns query normalization and serialisation. A query change that creates a new match must dispose the previous renderer and WebSocket session before starting the replacement session. `map=local` continues to use the existing local-storage bridge.

## Target layout

```text
apps/web/src/
  app/             bootstrap, providers, router, route errors
  pages/           route composition only
    match/
    laboratory/
  features/
    match/         match lifecycle, commands, selection, HUD, URL state
      laboratory-menu/  HUD navigation to laboratory routes
    laboratory/
      browser/     asset browser
      editor/      map editor
       report/      asset validation report
       diagnostics/ combined stress, determinism, and performance tools
  shared/
    transport/      browser-facing transport ports/adapters
    config/         route-safe application configuration
    lib/            generic helpers only
    components/     reusable application components
    ui/             Radix/shadcn primitives only
    types/
```

Do not create generic dumping-ground modules. A module belongs in `shared` only when it is genuinely reusable by more than one domain; otherwise it stays with its feature.

## Implementation slices

### 1. Application foundation and routing

- Add `react-router-dom`; replace the Vite MPA entry configuration with one SPA entry point.
- Move bootstrap and global providers into `app`; define every route in one typed route module.
- Add lazy route boundaries and route-level loading/error/not-found UI. Tools must not enter the initial match bundle.
- Replace hard-coded anchors with React Router navigation where navigation remains inside the app.
- Remove `sprites/index.html`, `det.html`, `perf.html`, their independent `main` entry points, MPA build inputs, and the `/sprites` redirect plugin.

### 2. Match domain extraction

- Make the match page a composition layer with no renderer, WebSocket, selection, command, or HUD business logic.
- Decompose the current session hook into cohesive modules, each below the project size guideline:
  - route/query parsing and canonical URL writes;
  - WebSocket transport and its public `MatchConnection` contract;
  - renderer lifecycle and imperative callbacks;
  - snapshot-to-UI projections;
  - selection/building/mineral state;
  - command mode and building-placement handling;
  - E2E-only debug bridge.
- Preserve protocol validation at the transport boundary, renderer ownership rules, existing selection and command behaviour, and cleanup on unmount.
- Move HUD components, types, and pure logic into the match feature or match entity according to ownership. The Laboratory menu belongs to the match feature because it is rendered in the top bar and only owns navigation links.

### 3. Tool migration

- Convert Sprite Lab sections into independent lazy Laboratory routes rather than a second React root and tabs-as-navigation.
- Keep asset loading, Pixi resource pause/resume/dispose, editor local persistence, playtest-map handoff, and the existing browser hooks intact.
- Preserve `window.__spriteLab`, `window.__runDetFixture`, and `window.__runRendererPerf` as explicitly test-only browser contracts, colocated with the feature that supplies each one.
- The editor's "playtest" action navigates to `/?map=local`; the match route consumes the persisted map as it does today.

### 4. Architecture enforcement and documentation

- Add a focused architecture test that reads web source imports and rejects upward-layer imports and cross-feature deep imports. Allow imports from `shared` and a target feature/entity public `index.ts` only.
- Update `docs/architecture.md`, `docs/specs/SPEC-browser-client.md`, `docs/specs/SPEC-level-editor.md`, RFC-001, RFC-002, and any task references that name removed web paths.
- Amend DEPLOY-002's contract: static assets are served exactly, `/health` and WebSocket remain explicit, and non-asset SPA requests fall back to `index.html`. Server implementation stays in DEPLOY-002 unless deployment work is explicitly included.

## Read first

- `docs/engineering-standard.md`
- `docs/architecture.md`
- `docs/rfc/RFC-001-technology-substitutability.md`
- `docs/rfc/RFC-002-deployment-and-environments.md`
- `apps/web/vite.config.ts`
- `apps/web/src/app/App.tsx`
- `apps/web/src/features/match/ui/MatchScreen.tsx`
- `apps/web/src/features/match/lifecycle/useMatchSession.ts`
- `apps/web/src/shared/transport/connection.ts`
- `apps/web/src/features/laboratory/browser/AssetBrowserFeature.tsx`
- `tests/e2e/scenarios.spec.ts`
- `tests/e2e/sprites-lab.spec.ts`
- `playwright.config.ts`

## Tests and validation

1. Update unit-test imports after moves; retain coverage for snapshot projection, HUD selection logic, terrain persistence/geometry/catalogue, and `map=local`.
2. Add unit coverage for URL parsing/normalisation and route-to-match configuration conversion.
3. Add architecture coverage for the layer and public-API import rules.
4. Update existing E2E specs to their new routes and add coverage for:
   - direct navigation and refresh for every tool route;
   - `/` with each existing scenario/query combination;
   - scenario replacement disposes/restarts a match cleanly;
   - Laboratory menu navigation from the match `TopBar`;
   - not-found rendering;
   - editor playtest navigation to `/?map=local`.
5. Before each focused browser run:

   ```bash
   pnpm run test:e2e:focused tests/e2e/<target>.spec.ts --list
   pnpm run test:e2e:focused tests/e2e/<target>.spec.ts
   ```

6. Completion gate:

   ```bash
   pnpm run verify
    pnpm run test:e2e:all
   git diff --check
   ```

## Acceptance and stop conditions

- [x] `/` remains a fully working match with all current query-param behaviour.
- [x] Every laboratory tool is a lazy route in the same React app and reachable through the Laboratory menu in the match `TopBar`.
- [x] Removed MPA URLs are absent from source, build inputs, tests, and documentation.
- [x] Match, laboratory, transport, and UI have explicit ownership and no forbidden layer imports.
- [x] Existing game, editor, asset, determinism, and performance browser contracts remain covered.
- [x] Typecheck, lint, unit/integration/architecture suites, build, and Chromium + Firefox E2E pass under Node 24.
- [x] Stop after this migration; do not add lobby, account, visual redesign, or unrelated gameplay work.

## Risks and rollback

- This is intentionally a single large migration. Take a reviewed baseline commit before beginning and keep the current Sprite Lab work intact; the working tree already contains uncommitted Sprite Lab changes.
- Routing changes affect the future static-serving design. The rollout cannot claim production deep-link support until DEPLOY-002 implements the documented SPA fallback.
- The fastest rollback is reverting the migration commit as one unit. Do not attempt a partial rollback of routing while moved imports remain in place.
