# RFC-003 — Cost, Scale, and Architecture Comparison

Status: **Proposed** (no implementation started)
Date: 2026-09-18
Source: infrastructure analysis, 2026-09-18
Related: RFC-001 (technology substitutability), RFC-002 (deployment)

## Summary

This RFC compares four architecture tiers and their cost at different player
counts, from the current isolated-session demo to a production-scale shared-world
system. The goal is to provide a concrete cost/performance roadmap from $0 to
200,000 concurrent players.

The key finding: **the biggest cost reduction is not protocol optimization — it
is moving from isolated sessions to shared rooms.** This alone reduces cost 20×.

## 1. Project constants

| Parameter | Value |
|---|---|
| Full snapshot (12 units, bases, minerals) | ~3 KB |
| Tick rate | 20 Hz (50 ms) |
| CPU per tick per session | ~0.3 ms |
| Memory per session | ~3 MB |
| Client bundle (first load) | ~10 MB |
| Scenario: 8v8 | 16 units + 2 bases + 1 mineral node |

## 2. Architecture A: Isolated sessions (current)

Each client gets a full, private simulation. Nothing is shared.

| Concurrent users | Egress/s | Egress/hour | CPU/tick (total) | Memory | Render Free | Starter ($7) | Pro ($20) |
|---|---|---|---|---|---|---|---|
| 1 | 60 KB | 216 MB | 0.3 ms | 3 MB | ✅ | ✅ | ✅ |
| 10 | 600 KB | 2.16 GB | 3 ms | 30 MB | ✅ | ✅ | ✅ |
| 20 | 1.2 MB | 4.32 GB | 6 ms | 60 MB | ⚠️ | ✅ | ✅ |
| 50 | 3 MB | 10.8 GB | 15 ms | 150 MB | ❌ | ✅ | ✅ |
| 100 | 6 MB | 21.6 GB | 30 ms | 300 MB | ❌ | ⚠️ | ✅ |
| 500 | 30 MB | 108 GB | 150 ms | 1.5 GB | ❌ | ❌ | ⚠️ |
| 1.000 | 60 MB | 216 GB | 300 ms | 3 GB | ❌ | ❌ | ❌ |
| 10.000 | 600 MB | 2.16 TB | 3 s | 30 GB | ❌ | ❌ | ❌ |

**Cost for 1,000 concurrent users:**

| Platform | Compute | Egress (216 GB) | Total/month |
|---|---|---|---|
| AWS EC2 (c6g.xlarge) | $140 | $19 | **$160** |
| Google Cloud (e2-standard-4) | $120 | $19 | **$140** |
| Fly.io (4× performance-4×) | $140 | $15 | **$155** |
| DigitalOcean (4× s-4vcpu-8gb) | $160 | $0 (included) | **$160** |
| Hetzner (AX102) | $55 | $0 (included) | **$55** |

## 3. Architecture B: Delta snapshots

Same isolated sessions, but only send changes after the first tick.
First tick = full (3 KB). Subsequent ticks = ~200 bytes (units that moved,
health changed, orders changed).

| Concurrent users | Egress/s (avg) | Egress/hour | CPU/tick | Memory |
|---|---|---|---|---|
| 1 | 4 KB | 14.4 MB | 0.3 ms | 3 MB |
| 10 | 40 KB | 144 MB | 3 ms | 30 MB |
| 100 | 400 KB | 1.44 GB | 30 ms | 300 MB |
| 1.000 | 4 MB | 14.4 GB | 300 ms | 3 GB |
| 10.000 | 40 MB | 144 GB | 3 s | 30 GB |

**Gain vs A:** ~93% less egress. CPU and memory unchanged.

## 4. Architecture C: Shared rooms (2–8 players)

One simulation per room. All players in the room receive the same state.
Delta snapshots reduce bandwidth. Each room runs one tick, not one tick per
player.

| Rooms (2p) | Players | Egress/s | Egress/hour | CPU/tick | Memory |
|---|---|---|---|---|---|
| 1 | 2 | 800 B | 2.9 MB | 0.3 ms | 3 MB |
| 10 | 20 | 8 KB | 29 MB | 3 ms | 30 MB |
| 50 | 100 | 40 KB | 144 MB | 15 ms | 150 MB |
| 100 | 200 | 80 KB | 288 MB | 30 ms | 300 MB |
| 500 | 1.000 | 400 KB | 1.44 GB | 150 ms | 1.5 GB |
| 1.000 | 2.000 | 800 KB | 2.88 GB | 300 ms | 3 GB |
| 5.000 | 10.000 | 4 MB | 14.4 GB | 1.5 s | 15 GB |

**Gain vs A:** ~97% less egress, ~95% less CPU, ~95% less memory.

**Cost for 10,000 concurrent players:**

| Platform | Compute | Egress (14.4 GB) | Total/month |
|---|---|---|---|
| AWS EC2 (c6g.large) | $50 | $1.30 | **$51** |
| Google Cloud (e2-standard-2) | $50 | $1.30 | **$51** |
| Fly.io (2× performance-2×) | $50 | $1.00 | **$51** |
| Hetzner (AX52) | $28 | $0 | **$28** |

## 5. Architecture D: Rooms + delta + fog of war + binary protocol

Minimum per player: only visible units, only changes, MessagePack encoding.
Fog of war filters what each player sees (~50–70% of units hidden at any time).

| Players | Egress/s (avg) | Egress/hour | CPU/tick |
|---|---|---|---|
| 100 | 20 KB | 72 MB | 15 ms |
| 1.000 | 200 KB | 720 MB | 150 ms |
| 10.000 | 2 MB | 7.2 GB | 1.5 s |
| 100.000 | 20 MB | 72 GB | 15 s |
| 1.000.000 | 200 MB | 720 GB | 150 s |

**Gain vs A:** ~99.6% less egress.

**Cost for 100,000 concurrent players:**

| Platform | Compute | Egress (72 GB) | Total/month |
|---|---|---|---|
| AWS (c6g.4xlarge, autoscale) | $400 | $6.50 | **$407** |
| Google Cloud (e2-standard-16, autoscale) | $400 | $6.50 | **$407** |
| Fly.io (8× performance-8×) | $380 | $5.10 | **$385** |
| Hetzner (AX162, 2×) | $130 | $0 | **$130** |

## 6. Final comparison: 200,000 concurrent players

| Architecture | Egress/hour | Compute needed | Cost/month (Hetzner) | Cost/month (AWS) |
|---|---|---|---|---|
| A (current) | 144 GB | impossible | ❌ | ❌ |
| B (delta) | 9.6 GB | 2× 16-core | $110 | $814 |
| C (rooms + delta) | 576 MB | 1× 8-core | $55 | $407 |
| D (rooms + delta + fog + binary) | 288 MB | 1× 4-core | $28 | $200 |

## 7. Recommended path

```
Phase 1 (now):     Isolated sessions, Render free          → $0/mo, ~20 players
Phase 2 (delta):   Delta snapshots, Render Starter         → $7/mo, ~200 players
Phase 3 (rooms):   Shared rooms, Render Pro                → $20/mo, ~2,000 players
Phase 4 (scale):   Rooms + Hetzner/Fly, autoscale          → $30–60/mo, ~50k players
Phase 5 (200k):    Rooms + multiple servers + CDN          → $100–400/mo
```

The biggest cost reduction is **not** protocol optimization — it is moving from
isolated sessions to shared rooms. This alone reduces cost 20×.

## 8. Task breakdown

| ID | Title | Depends on | Packages | Validation |
|---|---|---|---|---|
| SCL.01 | Delta snapshots (protocol + server) | — | protocol, simulation, server | determinism, integration |
| SCL.02 | Shared room system (matchmaking + rooms) | — | server, protocol | integration, e2e |
| SCL.03 | Binary protocol (MessagePack) | SCL.01 | protocol | unit, integration |
| SCL.04 | Fog of war (filtered snapshots) | SCL.02 | simulation, protocol | unit, simulation |

## 9. Risks

| # | Risk | Impact | Mitigation |
|---|---|---|---|
| R1 | Delta snapshots add complexity to protocol | Medium | Start with simple diff, iterate |
| R2 | Rooms require matchmaking, player assignment | High | Phase 3, not now |
| R3 | Fog of war changes gameplay balance | Medium | Phase 4, test with players |
| R4 | Binary protocol breaks existing clients | Low | Versioned messages, gradual migration |
| R5 | Hetzner is unmanaged (you handle ops) | Medium | Start with managed (Render/Fly), migrate later |
