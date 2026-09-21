# RFC-002 — Deployment, Environments, and Free-Tier Infrastructure

Status: **Proposed** (no implementation started)
Date: 2026-09-18
Source: infrastructure research, 2026-09-18
Related: RFC-001 (technology substitutability), `docs/architecture.md`,
`.github/workflows/ci.yml`, `apps/server/src/main.ts`, `apps/web/vite.config.ts`

## Summary

This RFC defines how to deploy the game with automatic deploys and a good-enough
infrastructure for free, while preserving staging and production environments.

Decisions locked with the maintainer:

- **Primary platform:** Render (free/Hobby workspace, no credit card).
- **Packaging:** Docker from the start (multi-stage), even though Render's native
  Node runtime would work.
- **Topology:** single Docker image per environment, same-origin monolith (the
  Node server serves the built web client and the WebSocket).
- **Anti-sleep:** none. Accept the ~1 minute cold start after 15 minutes idle;
  keep the instance-hour budget for staging and previews.
- **Staging:** a dedicated service on a `staging` branch.

The biggest real constraint is **not** instance hours; it is **outbound bandwidth
(5 GB/month)** because the server sends a full snapshot at 20 Hz to every client.

## 1. Goals and non-goals

### Goals

- Automatic deploys from Git, gated by the existing CI.
- Two environments: `staging` and `production`, both free.
- A single deployable artifact (Docker image) that runs the server and the client.
- A path to always-on and to other providers without rewriting the app.
- No secrets in the repository; no paid service required to start.

### Non-goals

- No database, persistence, accounts, or authentication.
- No multi-region, autoscaling, or zero-downtime requirement.
- No paid observability (APM/tracing).
- No protocol redesign (snapshot bandwidth is documented as a risk, not fixed here).
- No Kubernetes or self-managed orchestration.

## 2. Application constraints

| Constraint | Evidence |
|---|---|
| Node `>=24`, pnpm `10.33.2` | `package.json` (`engines`, `packageManager`) |
| pnpm monorepo (`apps/*`, `packages/*`, `tools/*`) | `pnpm-workspace.yaml` |
| Long-running HTTP + WebSocket server | `apps/server/src/main.ts:10-20` |
| One simulation session per connection, `setInterval` 50 ms | `apps/server/src/main.ts:39-78` |
| Port from `process.env.PORT ?? 8080` | `apps/server/src/main.ts:7` |
| Health endpoint `/health` | `apps/server/src/main.ts:11-15` |
| Vite MPA (index, det, perf, sprites) + `/sprites` redirect | `apps/web/vite.config.ts:34-49` |
| Client WebSocket URL is **build-time** | `apps/web/src/screens/useMatchSession.ts:19` |
| `WS_ORIGIN` declared but unused | `.env.example:4` |
| No DB/Redis; all state in memory | `apps/server/src/main.ts` |
| Web build ≈ 5.9 MB `dist` + 4.6 MB `public` | local `du` |
| NodeNext TS, `workspace:*` deps, per-package `dist` | `tsconfig.base.json`, `apps/server/tsconfig.json` |

Root build is `pnpm -r build` (topological). Server start is
`node apps/server/dist/main.js`.

## 3. Platform evaluation (2026)

| Platform | Long-running WS | Free staging+prod | Card | Free limits that matter | Notes |
|---|---|---|---|---|---|
| **Render** | Yes | Yes (2 free web services) | No | 750 instance-h/mo, 500 pipeline-min/mo, **5 GB egress/mo**, 0.1 CPU/512 MB; sleeps after 15 min idle | Blueprints (IaC), Docker, custom domains + TLS, `autoDeployTrigger: checksPass`; full preview environments require Pro |
| **Northflank** | Yes | Yes (2 always-on) | Yes (verification only) | Sandbox: 2 services, 1 DB, 2 cron; always-on | Best free option if always-on is required; pay-as-you-go after |
| **Railway** | Yes | No | No | Free: **$1/mo** credit; Hobby $5 includes $5 | Not enough for two environments |
| **Koyeb** | Yes | No | Yes | 1 service, scale-to-zero | One service only |
| **Fly.io** | Yes | No | Yes | No permanent free tier (~$2–5/mo) | Best migration target for global/always-on |
| **Vercel / Netlify / Cloudflare Pages** | No | n/a | No | Serverless functions only | Cannot hold the 20 Hz WebSocket server |

**Decision:** Render Hobby as primary. Northflank Sandbox is the documented
alternative if always-on staging becomes necessary and card verification is
acceptable. Docker keeps Fly.io/Northflank/VPS as drop-in migration targets.

## 4. Topology

### Chosen: Docker + same-origin monolith (Option A)

One image per environment; the Node server serves the built client from
`apps/web/dist` and upgrades `/` to WebSocket.

```text
        HTTPS/WSS (same origin)
Browser ───────────────────────► Render web service (Docker, plan: free)
                                   ├─ static: apps/web/dist (index, det, perf, sprites)
                                   ├─ /health
                                   └─ ws://  → one GameSession per connection
```

Why:

- No CORS and no `WS_ORIGIN` cross-origin complexity for the happy path.
- No build-time `VITE_SERVER_URL` per environment (derive from `location`).
- One artifact to build, promote, roll back, and later move to another host.

Trade-off: no CDN for static assets. Acceptable while the egress budget is the
binding constraint anyway; revisit with Option B.

### Rejected for now: split static site + web service (Option B)

Static site (free, global CDN) plus a WebSocket service. Better caching and
cheaper static egress, but adds a second service per environment, cross-origin
WebSocket configuration, and a per-environment `VITE_SERVER_URL`. Reconsider when
static bandwidth dominates or a CDN is needed.

### Rejected for now: native runtime

`runtime: node` would avoid Docker. Docker was chosen deliberately for
reproducibility and portability; it also pins Node 24 and pnpm 10.33.2 exactly.

## 5. Environments and branch model

| Environment | Branch | Render service | Compute | Behavior |
|---|---|---|---|---|
| Local | any | — | — | `pnpm dev` (server 8080 + Vite 5173) |
| Staging | `staging` | `rts-idle-staging` | `free` | Auto-deploy; sleeps when idle |
| Production | `main` | `rts-idle-prod` | `free` | Auto-deploy; sleeps when idle |
| PR preview | PR branch | service preview (manual) | inherits | Optional, per-PR |

Flow: `feature/* → PR into staging → validate on staging URL → merge staging into main`.

### Branching, merge, and promotion procedure

For dependent work, follow `docs/ai/STACKED-PR-WORKFLOW.md`. Stacked task
branches target their parent branch and are rebased when the parent advances;
they are not updated by merging the parent into the child.

Create every new task branch from the current integration branch. Do not branch
from another feature branch, even when that feature has already been merged;
the merge or squash may have changed the commit ancestry.

For a new task branch:

```bash
git checkout main
git fetch origin
git pull --ff-only origin main
git checkout -b feat/nova-task
```

When the branch already exists, synchronize it before review:

```bash
git fetch origin main
git merge origin/main
pnpm run verify
git push
```

Before opening or updating a pull request, verify that the branch contains the
current target base. For a branch targeting `main`, for example:

```bash
git fetch origin
git merge-base --is-ancestor origin/main HEAD
```

The command must succeed. If it does not, merge the current target branch into
the task branch, resolve all conflicts locally, run the verification gate, and
push the updated branch before requesting review. The same procedure applies
with `origin/staging` when the pull request targets `staging`.

Promotion is strictly `feature → staging → main`: validate the feature on the
staging deployment first, then promote the tested `staging` history to
production. Render deploys only after the CI checks are green. After each
deployment, smoke-check `GET /health` and the application; if the deployment
is unhealthy, roll back to the previous deploy from the Render dashboard.

- A single `render.yaml` at the repo root defines both services; each service sets
  its `branch`, so the Blueprint lives on `main` while staging builds from
  `staging`.
- Service previews are opt-in (manual) to avoid surprise instance-hour usage.

### Free-tier budget math

Workspace (Hobby) limits per month: **750 instance hours**, **500 pipeline
minutes**, **5 GB egress**. Spun-down services do not consume instance hours.

- No anti-sleep ping (decision): both services sleep after 15 minutes idle.
  - Continuous prod usage alone would consume ~730 h; staging then has ~20 h.
  - Typical demo usage (e.g. 1 h/day per environment) consumes ~60 h/month.
- **Do not add a frequent uptime monitor.** A check every 30 min keeps the
  service awake 15 min each time → ~360 h/month. A 2×/day canary costs ~15 h/month
  and is the only monitoring pattern recommended on free.
- Docker builds consume pipeline minutes: budget ~3–6 min per build, so ~80–150
  builds/month. Fine for this project.
- Cold start: the first HTTP request or WS connection after idle takes ~1 minute.
  The client must handle it (see §8, DEPLOY-006).

### Egress budget (the binding constraint)

The server sends a **full snapshot every 50 ms** (`main.ts:75-78`) with units,
bases, mineral nodes, players, and events.

- Estimate per snapshot: ~2–4 KB → 40–80 KB/s → **144–288 MB per active
  client-hour**.
- 5 GB ≈ **17–35 client-hours/month**, plus the ~10 MB first load (~500 loads).
- This is not fixed in this RFC. Mitigations (future, ordered by value):
  1. Send snapshots at 10 Hz instead of 20 Hz (simulation tick unchanged).
  2. Delta encoding or a binary protocol.
  3. Option B (static/CDN) to remove static bytes from the web service.

## 6. render.yaml (Blueprint)

Two Docker web services, `plan: free`, region `virginia` (closest Render region to
Brazil), health check `/health`, CI-gated deploys, monorepo build filters.

```yaml
services:
  - type: web
    name: rts-idle-prod
    runtime: docker
    plan: free
    region: virginia
    branch: main
    dockerfilePath: ./Dockerfile
    dockerContext: .
    healthCheckPath: /health
    autoDeployTrigger: checksPass
    maxShutdownDelaySeconds: 60
    buildFilter:
      paths:
        - apps/**
        - packages/**
        - tools/**
        - package.json
        - pnpm-lock.yaml
        - pnpm-workspace.yaml
        - tsconfig.base.json
        - Dockerfile
        - .dockerignore
        - render.yaml
      ignoredPaths:
        - docs/**
        - '**/*.md'
        - tests/**
        - .github/**
    envVars:
      - key: NODE_ENV
        value: production
      - key: HUSKY
        value: '0'
      - key: WS_ORIGIN
        sync: false   # set in the dashboard per environment

  - type: web
    name: rts-idle-staging
    runtime: docker
    plan: free
    region: virginia
    branch: staging
    dockerfilePath: ./Dockerfile
    dockerContext: .
    healthCheckPath: /health
    autoDeployTrigger: checksPass
    maxShutdownDelaySeconds: 60
    buildFilter:
      paths:
        - apps/**
        - packages/**
        - tools/**
        - package.json
        - pnpm-lock.yaml
        - pnpm-workspace.yaml
        - tsconfig.base.json
        - Dockerfile
        - .dockerignore
        - render.yaml
      ignoredPaths:
        - docs/**
        - '**/*.md'
        - tests/**
        - .github/**
    envVars:
      - key: NODE_ENV
        value: production
      - key: HUSKY
        value: '0'
      - key: WS_ORIGIN
        sync: false
```

Notes:

- `autoDeployTrigger: checksPass` makes Render deploy only after the GitHub CI
  checks for the branch pass — no deploy workflow needed. Fallback if the
  integration misbehaves: `autoDeployTrigger: off` plus a Render Deploy Hook
  called from a GitHub Actions job that runs after `verify`.
- Render sets `PORT` automatically; do not define it.
- `WS_ORIGIN` is the origin allowlist enforced in §8 (currently unused in code).
- The render.yaml `projects.environments` feature exists but may require a paid
  workspace; branch-based services are used instead for safety.

## 7. Docker packaging

Multi-stage build, small final image (cold starts pay image-pull time), non-root
runtime, exact toolchain.

Sketch:

```dockerfile
# ---- builder ----
FROM node:24-bookworm-slim AS builder
ENV HUSKY=0
RUN corepack enable
WORKDIR /repo
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json .npmrc* ./
COPY apps ./apps
COPY packages ./packages
COPY tools ./tools
COPY tsconfig.base.json ./
RUN pnpm install --frozen-lockfile
RUN pnpm -r build

# ---- runner ----
FROM node:24-bookworm-slim AS runner
ENV NODE_ENV=production HUSKY=0
WORKDIR /app
RUN corepack enable
# Install production dependencies for the server and copy the built workspace.
COPY --from=builder /repo/pnpm-lock.yaml /repo/pnpm-workspace.yaml /repo/package.json ./
COPY --from=builder /repo/apps/server/package.json ./apps/server/package.json
COPY --from=builder /repo/packages ./packages
COPY --from=builder /repo/apps/server/dist ./apps/server/dist
COPY --from=builder /repo/apps/web/dist ./apps/web/dist
RUN pnpm install --prod --frozen-lockfile --filter @rts/server...
USER node
EXPOSE 8080
CMD ["node", "apps/server/dist/main.js"]
```

The exact pruning strategy (e.g. `pnpm --filter @rts/server deploy --prod`) is an
implementation detail to validate locally with `docker build` + `docker run`. The
final image must:

- Start with `node apps/server/dist/main.js`.
- Contain the built server and the built web client.
- Run as a non-root user.
- Respond `200` on `/health`.
- Not contain `node_modules` from the builder beyond production deps.

A `.dockerignore` must exclude `node_modules`, `**/dist`, `.git`, `tests`,
`docs`, `.github`, coverage, and Playwright artifacts.

## 8. Production hardening (required before exposing)

These are code changes tracked as tasks; the RFC only specifies them.

1. **Same-origin WebSocket URL (client).** Default to
   `wss://<location.host>` when `VITE_SERVER_URL` is unset, keeping the override
   for local/split deployments. Removes the build-time coupling
   (`useMatchSession.ts:19`). Coordinate with RFC-001 PR3 (PlatformServices).
2. **Static serving (server).** Serve `apps/web/dist` with MPA semantics:
   `/` → `index.html`; `/sprites` → `301 /sprites/`; `/sprites/` →
   `sprites/index.html`; exact files otherwise; `404` fallback (no SPA rewrite).
   Hashed `/assets/*` get long-lived immutable cache headers; HTML is
   `no-cache`.
3. **Graceful shutdown (server).** On `SIGTERM`, stop accepting connections,
   clear every session timer, close the WebSocket server, then exit. Align with
   `maxShutdownDelaySeconds`.
4. **Origin validation (server).** Reject WebSocket upgrades whose `Origin` is
   not in `WS_ORIGIN` (comma-separated allowlist). This finally uses the existing
   env var.
5. **Connection cap (server).** Reject upgrades beyond a fixed maximum to protect
   the 512 MB / 0.1 CPU free instance; close sessions on disconnect.
6. **Backpressure (server).** Skip a snapshot when `ws.bufferedAmount` exceeds a
   threshold, to avoid unbounded memory on slow clients.
7. **Client reconnect (web).** Exponential backoff and a visible "waking server"
   state during the ~1 minute cold start; surface a clear error on repeated
   failure.

## 9. Configuration matrix

| Variable | Local | Staging | Production | Notes |
|---|---|---|---|---|
| `PORT` | `8080` | Render sets | Render sets | Server reads it |
| `NODE_ENV` | `development` | `production` | `production` | |
| `HUSKY` | unset | `0` | `0` | Avoid hooks in CI/container |
| `WS_ORIGIN` | `localhost:5173` | staging host | prod host | Comma-separated allowlist |
| `VITE_SERVER_URL` | `ws://localhost:8080` | unset | unset | Same-origin default |
| `RENDER_EXTERNAL_HOSTNAME` | — | auto | auto | Provided by Render |

Secrets policy: nothing secret is committed. `.env.example` stays illustrative.
Render secrets use `sync: false` and are set in the dashboard. There is no
secret in the current runtime; `WS_ORIGIN` is the only environment-specific
value.

## 10. CI/CD

- Existing `.github/workflows/ci.yml` remains the quality gate: lint, build,
  typecheck, unit, integration, simulation, contracts, orders, determinism,
  architecture, invariants, regression, E2E, then release on `main`.
- Deploy is triggered by Render when checks pass (`autoDeployTrigger: checksPass`).
- Rollback: Render keeps the two most recent deploys on free; roll back from the
  dashboard, or redeploy a previous commit.
- Promotion: merge `staging` into `main`. No rebuild logic differs between
  environments (same image definition), so staging is representative.
- E2E in CI runs against local servers, not the deployed environment. After
  every deployment, manually smoke-check `GET /health` and confirm that the
  application establishes its WebSocket connection; roll back in Render if
  either check fails.

## 11. Observability

- **Health:** `/health` is the Render health check.
- **Logs:** Render log stream (free, limited retention).
- **Usage:** Render dashboard shows instance hours, pipeline minutes, and
  outbound bandwidth, with email alerts near limits.
- **Monitoring:** avoid external uptime monitors on free (they keep the service
  awake). Use a low-frequency canary (≤2×/day) or Render's email alerts.
- **No APM/tracing** on free.

## 12. Security

- Automatic TLS and free custom domains (add later).
- No secrets in the repo; no PII; no persistence.
- Non-root container, minimal base image.
- WebSocket origin allowlist (`WS_ORIGIN`).
- No authentication; the server creates an isolated session per connection.
- Future: rate limiting and abuse protection before any public launch.

## 13. Cost and scaling path

| Stage | Setup | Cost | Trigger to move |
|---|---|---|---|
| Free | Render Hobby, 2 free Docker services | $0 | — |
| Always-on | Render Starter per service | ~$7/mo each | Cold start hurts UX; staging must stay warm |
| Managed multi-service | Northflank pay-as-you-go | ~$5–6/mo per small service | Need always-on + pipelines on a budget |
| Self-hosted | VPS + Docker + Caddy/Cloudflare | ~$5–7/mo | Need control, cheaper egress, custom infra |

The Docker artifact makes all of these a configuration change, not a rewrite.
The first thing to outgrow is **5 GB egress**, not CPU.

## 14. Runbook

1. **First deploy:** push `main`; in Render, create a Blueprint from the repo
   (`render.yaml`); set `WS_ORIGIN` for each service.
2. **Staging branch:** create `staging`, push; confirm the staging service
   builds from it.
3. **Verify:** `GET /health` → `200`; open the app and confirm the WebSocket
   connects and units move.
4. **Rollback:** Render dashboard → service → Rollback to the previous deploy.
5. **Pause staging:** suspend the staging service from the dashboard when unused.
6. **Watch usage:** Billing → included usage (hours, pipeline minutes, egress).
7. **Rotate/change config:** edit `sync: false` vars in the dashboard, or
   `render.yaml` for non-secrets.

## 15. Task breakdown

| ID | Title | Depends on | Packages | Validation |
|---|---|---|---|---|
| DEPLOY-001 | Same-origin WebSocket URL in client | — | web | unit, e2e |
| DEPLOY-002 | Server static serving + MPA routes + cache headers | — | server | integration, e2e |
| DEPLOY-003 | Server hardening: SIGTERM, WS_ORIGIN, connection cap, backpressure | — | server | unit, integration |
| DEPLOY-004 | Multi-stage Dockerfile + `.dockerignore` + local smoke | DEPLOY-002 | root | `docker build`, `docker run` |
| DEPLOY-005 | `render.yaml` Blueprint + `staging` branch | DEPLOY-004 | infra | blueprint validate, manual deploy |
| DEPLOY-006 | Client reconnect/backoff + cold-start UX | DEPLOY-001 | web | e2e |
| DEPLOY-007 | CI deploy gating (`checksPass` or deploy hook) + secrets | DEPLOY-005 | infra | end-to-end deploy |
| DEPLOY-008 | Deployment docs (`docs/deployment.md`) + env docs | DEPLOY-005 | docs | review |
| DEPLOY-009 (deferred) | Snapshot bandwidth optimization (rate/delta) | — | protocol, simulation, server | determinism, e2e |

## 16. Risks

| # | Risk | Impact | Mitigation |
|---|---|---|---|
| R1 | 5 GB egress is consumed by 20 Hz snapshots | High | Document usage; DEPLOY-009; Option B (CDN) |
| R2 | 0.1 CPU / 512 MB limits concurrent clients | Medium | Connection cap; load smoke test; upgrade to Starter |
| R3 | ~1 min cold start after idle | Medium | DEPLOY-006 UX; optional paid always-on |
| R4 | Docker builds consume pipeline minutes | Low | Build filters; small image; caching |
| R5 | Free service restarts lose sessions | Low | Accept (in-memory design) |
| R6 | Blueprint `projects.environments` may be paid-only | Low | Branch-based services (chosen) |
| R7 | DEPLOY-001 overlaps RFC-001 PR3 (`useMatchSession`) | Low | Sequence DEPLOY-001 with/after PR3 |

## 17. Open questions

- Custom domain/name now or later? (Free on Render; not required to start.)
- Is reducing snapshot frequency to 10 Hz acceptable for gameplay feel?
- If egress is exceeded, is a $7/mo always-on step acceptable, or should the
  project move to Northflank/VPS instead?
