# AUDIT REPORT — rts-idle

**Date:** 2026-09-18
**Auditor:** opencode (automated analysis)
**Methodology:** Full repository exploration, code reading, test execution, documentation review

---

## Commands Executed

| Command | Result |
|---------|--------|
| `pnpm run typecheck` | PASS — 13 packages, 0 errors |
| `pnpm run lint` | PASS — 2 warnings (unused variable, implicit boolean), 0 errors |
| `pnpm run test:unit` | PASS — 16 files, 136 tests |
| `pnpm run test:integration` | PASS — 4 files, 17 tests |
| `pnpm run test:simulation` | PASS — 10 files, 42 tests |
| `pnpm run test:contracts` | PASS — 2 files, 6 tests |
| `pnpm run test:orders` | PASS — 1 file, 6 tests |
| `pnpm run test:determinism` | PASS — 2 files, 6 tests |
| `pnpm run test:invariants` | PASS — 1 file, 6 tests |
| `pnpm run test:architecture` | PASS — 3 files, 61 tests |
| `pnpm run build` | PASS — all packages + Vite app built successfully |

**Total: 280 tests passing, 14 E2E specs, 0 failures.**

---

## 1. VISÃO GERAL DO PROJETO

### Stack

| Layer | Technology |
|-------|-----------|
| Language | TypeScript (strict mode) |
| Runtime | Node.js ≥ 24, modern browsers |
| Monorepo | pnpm workspaces (v10.33.2) |
| Rendering | PixiJS v8 + pixi-viewport (WebGL2) |
| UI Framework | React (menus, HUD, overlays) |
| UI Components | Radix UI + Tailwind CSS v4 + shadcn/ui |
| Server | Node.js + ws (WebSocket) |
| Testing | Vitest 4.x (unit/integration/sim), Playwright 1.50 (E2E), fast-check (installed, unused) |
| Lint/Format | Biome 2.5 |
| Build | Vite (web app), tsc (packages) |
| CI/CD | GitHub Actions, semantic-release, commitlint, husky, lint-staged |
| Package Manager | pnpm with minimumReleaseAge supply-chain guard |

### Arquitetura

Monorepo com 8 packages, 2 apps, 3 tools:

```
packages/
  shared/      — deterministic primitives (fixed-point, RNG, entity IDs, types)
  simulation/  — ECS core, systems pipeline, commands, snapshots
  game-data/   — map definitions (placeholder for content)
  pathfinding/ — EMPTY placeholder
  protocol/    — wire message types + type guards
  renderer/    — PixiJS rendering engine
  ai/          — EMPTY placeholder
  audio/       — EMPTY placeholder
apps/
  server/      — Node.js WebSocket server
  web/         — React + PixiJS browser client
tools/
  assets/      — asset preparation CLI
  balance/     — stub
  benchmark/   — stub
tests/
  11 directories: unit, integration, simulation, contracts, orders, determinism,
  invariants, architecture, e2e, fuzz, fixtures
```

### O Que é o Jogo

RTS idle/competitive browser-first com estética simples. Simulação determinística server-authoritative. O jogo deve escalar para milhares de entidades, replay, e multiplayer sem reescrever o core. O design é "Build small. Engineer large." — arquitetura robusta para um jogo de escala moderada.

---

## 2. ESTADO REAL — IMPLEMENTADO VS PRETENDIDO

### IMPLEMENTADO E FUNCIONANDO

| Sistema | Evidência |
|---------|-----------|
| ECS engine customizado | 7 componentes, world CRUD, component stores — `packages/simulation/src/ecs/` |
| Fixed timestep engine | 20 ticks/s, `step()` single-writer — `packages/simulation/src/engine/simulation.ts` |
| Determinismo bit-exacto | Integer fixed-point, xoshiro128**, SHA-256 hashes — testes dourados passando |
| 7 comandos completos | MOVE, STOP, HOLD, PATROL, ATTACK, ATTACK_MOVE, SURRENDER — validação atômica |
| 6 sistemas na pipeline | orders → movement → combat → death → victory — ordem congelada (ADR-013) |
| 3 tipos de unidade | pawn (100hp/10dmg), warrior (150hp/15dmg), archer (60hp/8dmg/range 3) |
| Combat com morte simultânea | Buffer de dano por tick, aplicação simultânea, limpeza de ordens |
| Vitória/derrota/empate | Eliminação, timeout (5000 ticks), draw |
| Snapshot/hash/export | Serialização canônica binária, restauração, verificação SHA-256 |
| Formação determinística | Spiral offset para MOVE em grupo |
| PixiJS renderer completo | Unidades animadas (idle/run/attack), terrain autotile, water foam, dressing |
| Seleção de unidades | Click + box select, rings amarelos, panel de seleção |
| Comandos via HUD | CommandBar (Stop/Hold/Attack/AttackMove/Patrol/Surrender) |
| Combat visual | HP bars, damage popups, attack streaks, death explosions |
| Terrain rendering | Autotile 9x6, 5 palettes, water animated, dressing deterministic |
| Server WebSocket | Sessões isoladas por conexão, cenários pré-definidos |
| Client React | MatchScreen, TopBar, SelectionPanel, CommandBar, MatchOverlay |
| Sprite Lab | Ferramenta de browse/level/stress/report para assets |
| Testes | 280 passando, architecture barriers verdes, determinismo cross-browser |
| 15 ADRs | Decisões arquiteturais documentadas |
| 10 specs | Documentação de design completa |

### IMPLEMENTADO, MAS INCOMPLETO

| Sistema | Estado |
|---------|--------|
| game-data package | Apenas mapa competitivo (32x32). Sem definições de unidades/construções |
| PlayerState.gold | Campo existe, sempre 0. Sem economia |
| Protocolo wire | Move, Snapshot, Command, Error. Sem messages de sala/room |
| Scenario catalog | 6 cenários (6v6, 4v4, mixed, ffa, win, defeat). Sem matchmaking |
| Renderer assets | Manifest com 4 facções × 3 kinds × 3 animações. Pawn attack usa `interact_axe` como placeholder |
| Tools | assets CLI funciona. balance e benchmark são stubs |
| Building assets no manifest | 4 facções × 8 building types existem como PNGs, mas nenhum rendering ou sistema |
| Elevated terrain | Código existe mas `terrain-conversion.ts` achata para `land` (cliffs/stairs desabilitados) |

### STUB / MOCK / PLACEHOLDER

| Item | Detalhe |
|------|---------|
| `@rts/pathfinding` | `export const version = '0.1.0'` — zero código |
| `@rts/ai` | `export const version = '0.1.0'` — zero código |
| `@rts/audio` | `export const version = '0.1.0'` — zero código |
| `@rts/game-data` | Apenas mapa competitivo + types. Sem schemas, sem buildings, sem upgrades |
| `tools/balance` | package.json stub |
| `tools/benchmark` | package.json stub |
| Enemy AI inimigo | Ataques pré-roteados via scenario. Sem tomada de decisão real |
| Resource display no HUD | Chips de mineral/energy/supply aparecem mas `resources` é sempre `null` |

### PLANEJADO, MAS NÃO IMPLEMENTADO

| Sistema | Phase no Master Plan |
|---------|---------------------|
| Economy (coleta, depósito, cargo) | Phase 2 |
| Construção (placement, footprint, progresso) | Phase 2 |
| Supply management | Phase 2 |
| Production queue e training | Phase 2 |
| Research e modifiers | Phase 2 |
| Repair | Phase 2 |
| Pathfinding A* com budget incremental | Phase 3 |
| Collision e avoidance | Phase 3 |
| Fog of war e vision | Phase 3 |
| Projectiles e AoE | Phase 3 |
| Group movement | Phase 3 |
| 16 unidades (2 facções × 8) | Phase 4A |
| 6 tipos de construção | Phase 4A |
| AI/bot com strategic/tactical decisions | Phase 5 |
| Room lifecycle e multiplayer | Phase 6 |
| Replay recording/validation | Phase 7 |
| Browser MVP completo (minimap, controls) | Phase 8 |
| Audio, onboarding, deploy | Phase 9 |

### DESCONHECIDO

| Item | Nota |
|------|------|
| Performance real com 1000+ entidades | Stress test no Sprite Lab mede mas não registra números globais |
| Comportamento em mobile | Sem testes mobile, sem viewport mobile no renderer |
| Edge cases de networking | Sem reconexão, sem rate limiting, sem backpressure testados |

---

## 3. GAMEPLAY ATUAL

| Ação do Jogador | Status | Arquivos |
|-----------------|--------|----------|
| Entrar no jogo | ✅ funciona | `apps/web/src/screens/MatchScreen.tsx`, `apps/web/src/client/connection.ts` |
| Conectar ao server via WS | ✅ funciona | `apps/web/src/client/connection.ts`, `apps/server/src/main.ts` |
| Ver unidades renderizadas | ✅ funciona | `packages/renderer/src/unit-layer.ts` |
| Controlar câmera (pan/zoom) | ✅ funciona | `packages/renderer/src/renderer.ts` (pixi-viewport) |
| Selecionar unidades (click) | ✅ funciona | `packages/renderer/src/selection.ts` |
| Selecionar unidades (box) | ✅ funciona | `packages/renderer/src/selection.ts` |
| Mover unidades (right-click) | ✅ funciona | `packages/renderer/src/renderer.ts` → `apps/web/src/client/connection.ts` → server |
| Atacar alvo específico | ✅ funciona | CommandBar ATTACK → right-click enemy |
| Attack-move | ✅ funciona | CommandBar ATTACK_MOVE → right-click ground |
| Hold position | ✅ funciona | CommandBar HOLD |
| Stop | ✅ funciona | CommandBar STOP |
| Patrol | ✅ funciona | CommandBar PATROL → right-click ground |
| Surrender | ✅ funciona | CommandBar SURRENDER |
| Ver HP bars | ✅ funciona | `packages/renderer/src/hp-bar.ts` |
| Ver combat effects | ✅ funciona | `packages/renderer/src/effects-layer.ts` |
| Ver damage popups | ✅ funciona | `packages/renderer/src/effects-layer.ts` |
| Ver death explosions | ✅ funciona | `packages/renderer/src/effects-layer.ts` |
| Ver match result overlay | ✅ funciona | `apps/web/src/hud/MatchOverlay.tsx` |
| Trocar de cenário | ✅ funciona | TopBar scenario selector |
| Toggle agressividade inimiga | ✅ funciona | TopBar aggression switch |
| Criar/iniciar partida | 🟡 parcial | Conexão WS cria sessão automaticamente. Sem lobby, sem matchmaking |
| Escolher facção | 🔴 inexistente | Sem sistema de facções |
| Coletar recursos | 🔴 inexistente | Sem economia |
| Construir estruturas | 🔴 inexistente | Sem sistema de construção |
| Produzir unidades | 🔴 inexistente | Sem production queue |
| Explorar mapa | 🔴 inexistente | Sem fog of war |
| Minimap | 🔴 inexistente | Não implementada |
| Pause | 🔴 inexistente | Sem controle de pausa |
| Velocidade do jogo | 🔴 inexistente | Tick rate fixo 20/s |
| Restart | 🟡 parcial | "New match" no overlay recarrega a página |
| Tutorial | 🔴 inexistente | Sem onboarding |
| Configurações | 🔴 inexistente | Sem settings screen |
| Multiplayer (2 jogadores) | 🔴 inexistente | Sessões isoladas |
| Multiplayer (4 jogadores) | 🔴 inexistente | Sessões isoladas |
| Replay | 🔴 inexistente | Sem recording |
| Vitória por eliminação | ✅ funciona | `packages/simulation/src/systems/victory-system.ts` |
| Empate por timeout | ✅ funciona | 5000 ticks (~4 min) |

---

## 4. UNIDADES

### Implementadas no Código

| Unidade | Tipo | HP | Dano | Alcance | Cooldown | Velocidade | Custo | Tempo Produção | Comportamento | Animação | Morte |
|---------|------|-----|------|---------|----------|-----------|-------|----------------|---------------|----------|-------|
| **pawn** | melee | 100 | 10 | 1 tile | 20 ticks (1s) | 3 tiles/s | N/A | N/A | Ataca, move, hold | idle/run/interact_axe | explosão + remoção |
| **warrior** | melee | 150 | 15 | 1 tile | 20 ticks (1s) | 3 tiles/s | N/A | N/A | Ataca, move, hold | idle/run/attack1 | explosão + remoção |
| **archer** | ranged | 60 | 8 | 3 tiles | 20 ticks (1s) | 3 tiles/s | N/A | N/A | Ataca, move, hold | idle/run/shoot | explosão + remoção |

**O que é real:** Stats de combate, rendering animado, seleção, comandos, morte com efeitos visuais.
**O que é placeholder:** Pawn attack usa `interact_axe` (não é animação de ataque real). Sem custo/tempo de produção. Sem facções. Sem upgrade.

### Planejadas (Master Plan — Phase 4A/4B)

**Vanguard (8 unidades):** Worker, Soldier, Ranger, Guardian, Hunter, Siege, Raider, Titan
**Nexus (8 unidades):** Worker, Drone, Pulse, Sentinel, Disruptor, Artillery, Phantom, Colossus

Nenhuma das 16 unidades planejadas existe no código.

---

## 5. ESTRUTURAS / CONSTRUÇÕES

### Implementadas no Código

**NENHUMA.** Não existe sistema de construção. Building assets existem no manifest (archery, barracks, castle, house1-3, monastery, tower × 4 facções) mas não são renderizadas nem integradas.

### Planejadas (Master Plan)

| Building | Função | Custo | HP | Build Time |
|----------|--------|-------|-----|------------|
| Base | Workers, deposit, supply | 450M/350M | 1600/1300 | 60s |
| Supply | +8 supply | 100M/90M | 400/300 | 20s |
| Barracks | Initial units | 150M/130M | 900/700 | 35s |
| Factory | Advanced units | 200M/100E | 1100/850 | 45s |
| Tech Lab | Research | 150M/75E | 600/450 | 35s |
| Defense | Static defense | 125M/25E | 650/450 | 25s |

Nenhuma dessas existe no código.

---

## 6. RECURSOS E ECONOMIA

### Implementado

- `PlayerState.gold: number` — campo existe, sempre 0
- HUD mostra chips de mineral/energy/supply mas `resources` é sempre `null` (nunca populado do snapshot)
- Sem sistema de coleta, geração, armazenamento, gastos, ou limites
- Sem economia da IA (inimigos são pré-roteados)

### Planejado

| Recurso | Coleta | Cargo/Trip | Initial |
|---------|--------|------------|---------|
| Mineral | Worker coleta, 1s/trip | 10 | 400/player |
| Energy | Worker coleta, 2s/trip | 5 | 0/player |

**Nada disso existe no código.**

---

## 7. COMBATE

### Implementado e Funcionando

| Aspecto | Estado | Arquivo |
|---------|--------|---------|
| Target acquisition (ATTACK) | ✅指定 target via comando | `packages/simulation/src/commands/attack.ts` |
| Auto-acquire (HOLD/ATTACK_MOVE) | ✅ nearest enemy in range | `packages/simulation/src/systems/combat-system.ts` |
| Range check | ✅ dist² comparison (integer) | `packages/simulation/src/systems/combat-system.ts` |
| Damage dealing | ✅ accumulated per-tick buffer | `packages/simulation/src/systems/combat-system.ts` |
| Cooldown | ✅ ticks remaining, reset on fire | `packages/simulation/src/systems/combat-system.ts` |
| Simultaneous death | ✅ damage applied before death | `packages/simulation/src/systems/death-system.ts` |
| Chase (ATTACK) | ✅ per-tick chase before firing | `packages/simulation/src/systems/combat-system.ts` |
| Death removal | ✅ entity removed, orders cleared | `packages/simulation/src/systems/death-system.ts` |
| Events | ✅ attackFired, damageDealt, unitDied | `packages/shared/src/events.ts` |
| Determinism | ✅ same seed + commands = same result | Verified by determinism tests |

### NÃO Implementado

| Aspecto | Estado |
|---------|--------|
| Projectiles | 🔴 inexistente (damage instantâneo) |
| Armor / resistências | 🔴 inexistente |
| AoE | 🔴 inexistente |
| Abilities | 🔴 inexistente |
| Retreat behavior | 🔴 inexistente |
| Aggro system | 🔴 inexistente |
| Feedback visual de alcance | 🔴 inexistente |
| Combat entre estruturas | 🔴 inexistente (sem estruturas) |

---

## 8. MOVIMENTAÇÃO

### Implementado

| Aspecto | Estado | Arquivo |
|---------|--------|---------|
| Move to position | ✅ straight-line | `packages/simulation/src/systems/movement-system.ts` |
| Formation spread | ✅ deterministic spiral | `packages/simulation/src/formation.ts` |
| Arrival detection | ✅ integer distance check | `packages/simulation/src/systems/movement-step.ts` |
| Sub-unit precision | ✅ remainder accumulator | `packages/simulation/src/systems/movement-step.ts` |
| Interpolação visual | ✅ linear lerp entre ticks | `packages/renderer/src/interpolation.ts` |
| Determinism | ✅ integer-only arithmetic | Verified by tests |

### NÃO Implementado

| Aspecto | Estado |
|---------|--------|
| Pathfinding (A*) | 🔴 `@rts/pathfinding` é vazio |
| Obstacle avoidance | 🔴 inexistente |
| Collision | 🔴 inexistente |
| Group movement | 🟡 formation spiral apenas |
| Terrain-aware movement | 🔴 inexistente |
| Performance com muitas entidades | 🔴 sem benchmark formal |

**Algoritmo atual:** Movimento em linha reta. Sem pathfinding. Unidades atravessam terreno e outras unidades.

---

## 9. SIMULAÇÃO / DETERMINISMO

### Implementado e Robusto

| Aspecto | Estado | Evidência |
|---------|--------|-----------|
| Fixed timestep | ✅ 20 ticks/s | `TICKS_PER_SECOND = 20` |
| Simulation tick | ✅ `step()` single-writer | `packages/simulation/src/engine/simulation.ts` |
| RNG determinístico | ✅ xoshiro128** com state explícito | `packages/shared/src/rng/` |
| Seeds | ✅ integer seed → 4-word state | `packages/shared/src/rng/create-rng.ts` |
| Serialização canônica | ✅ big-endian, schema fixa, UTF-8 portátil | `packages/simulation/src/canonical/` |
| Snapshot/restore | ✅ export/import com hash matching | `packages/simulation/src/snapshot/` |
| Hash de verificação | ✅ SHA-256 a cada tick | `packages/simulation/src/snapshot/hash.ts` |
| Comandos imutáveis | ✅ validated before mutation | `packages/simulation/src/commands/` |
| Separação simulation/render | ✅ isolamento enforced by tests | `tests/architecture/simulation-isolation.test.ts` |
| Rollback possível | ✅ snapshot restore existe | `packages/simulation/src/engine/simulation-from-snapshot.ts` |
| Replay possível | ✅ seed + commands reproduz | `tests/determinism/` |
| Estado autoritativo | ✅ server owns simulation | `apps/server/src/sessions/session.ts` |
| Determinismo cross-runtime | ✅ Node ≡ Chromium | `tests/e2e/determinism-browser.spec.ts` |

### Multiplayer Readiness

A arquitetura **suporta** multiplayer competitivo teoricamente:
- Server-authoritative simulation
- Client-only rendering
- Deterministic replay
- Command isolation

**Mas multiplayer NÃO está implementado.** Não existe:
- Room creation/joining
- Player assignment
- Synchronized start
- Network command sequencing
- Reconnection
- Rate limiting

---

## 10. IA DO OPONENTE

### Estado Atual: NÃO EXISTE IA

O inimigo atual é controlado por **ataques pré-roteados** definidos nos cenários:

```typescript
// apps/server/src/demo/scenarios.ts
// Units receive ATTACK_MOVE orders to hardcoded coordinates at scenario start
```

Não há tomada de decisão, não há economy, não há produção, não há scouting, não há adaptação.

O `@rts/ai` package é vazio (`export const version = '0.1.0'`).

### Planejado (Phase 5)

- Strategic layer: worker distribution, mineral gathering, supply management, building construction
- Tactical layer: scouting, target priority, focus fire, retreat, regroup
- Dificuldade: Easy (decisions a cada 10 ticks) vs Normal (a cada 4 ticks)
- Deterministic: `observation + memory → commands + nextMemory`
- Self-play gate: 100 matches, ≥95% end by elimination

---

## 11. MAPA

### Implementado

| Aspecto | Estado | Detalhe |
|---------|--------|---------|
| Mapa competitivo | ✅ | 32×32 tiles, `packages/game-data/src/maps/competitive.ts` |
| Simetria | ✅ | 180-degree rotational |
| Terrenos | ✅ | water, land, elevated (elevated flattenable) |
| Border | ✅ | 4-tile water frame |
| Central channel | ✅ | Water (14,14)-(17,17) |
| Plateaus | ✅ | Two elevated areas |
| Stairs | 🟡 | Code exists mas always empty |
| Palette | ✅ | 5 palettes (color1-color5) |
| Decoration | ✅ | Deterministic scatter (bush, tree, rock, etc.) |

### NÃO Implementado

| Aspecto | Estado |
|---------|--------|
| Mapa 192×192 planejado | 🔴 não existe |
| Resource nodes no mapa | 🔴 inexistente |
| Spawn points | 🔴 hardcoded no cenário |
| Minimap | 🔴 inexistente |
| Fog of war | 🔴 inexistente |

---

## 12. UI / UX

### Funcional

| Componente | Estado | Arquivo |
|------------|--------|---------|
| HUD TopBar | ✅ | `apps/web/src/hud/TopBar.tsx` — logo, status, tick, scenario, aggression, resources |
| SelectionPanel | ✅ | `apps/web/src/hud/SelectionPanel.tsx` — unit chips, HP bars |
| CommandBar | ✅ | `apps/web/src/hud/CommandBar.tsx` — Stop, Hold, Attack, AttackMove, Patrol, Surrender |
| MatchOverlay | ✅ | `apps/web/src/hud/MatchOverlay.tsx` — Victory/Defeat/Draw |
| Selection rings | ✅ | `packages/renderer/src/selection.ts` |
| Selection box | ✅ | `packages/renderer/src/selection.ts` |
| Health bars overhead | ✅ | `packages/renderer/src/hp-bar.ts` |
| Combat effects | ✅ | `packages/renderer/src/effects-layer.ts` |
| Command ping | ✅ | `packages/renderer/src/ping.ts` |
| Sprite Lab | ✅ | `apps/web/src/sprites/SpritesApp.tsx` — browse, terrain, stress, report |
| shadcn/ui components | ✅ | 15 componentes (button, card, select, tabs, etc.) |

### Placeholder / Inexistente

| Componente | Estado |
|------------|--------|
| Resource display real | 🟡 aparece mas sempre null |
| Minimap | 🔴 inexistente |
| Build menu | 🔴 inexistente |
| Production queue | 🔴 inexistente |
| Unit portraits | 🔴 inexistente |
| Context menus | 🔴 inexistente |
| Configurações | 🔴 inexistente |
| Tutorial/Onboarding | 🔴 inexistente |

---

## 13. ÁUDIO / VFX / ANIMAÇÃO

### Implementado

| Item | Estado |
|------|--------|
| Unit sprites animados | ✅ idle/run/attack per kind |
| Terrain autotile | ✅ 9x6 atlas, NESW masking |
| Water foam animado | ✅ 16-frame strip |
| Attack streaks | ✅ yellow line 120ms |
| Damage popups | ✅ white text 700ms |
| Death explosions | ✅ orange circle 450ms |
| Terrain dressing | ✅ deterministic scatter |

### Placeholder / Inexistente

| Item | Estado |
|------|--------|
| `@rts/audio` package | 🔴 vazio |
| Sons de combate | 🔴 inexistentes |
| Música | 🔴 inexistente |
| Sound effects | 🔴 inexistentes |
| Particle system | 🔴 procedural Graphics, sem partículas reais |
| Projectile animation | 🔴 arrow asset existe mas não voa |
| Building rendering | 🔴 assets existem, sem código |

---

## 14. MULTIPLAYER / SALAS

### Estado Atual: ZERO MULTIPLAYER REAL

| Aspecto | Estado |
|---------|--------|
| Backend | ✅ Node.js WebSocket server existe |
| Networking | ✅ JSON over ws |
| Criação de sala | 🔴 inexistente |
| Matchmaking | 🔴 inexistente |
| Lobby | 🔴 inexistente |
| Conexão entre jogadores | 🔴 inexistente (sessões isoladas) |
| Sincronização | 🔴 inexistente |
| Autoridade | ✅ server-authoritative (per connection) |
| Reconexão | 🔴 inexistente |
| 2 jogadores | 🔴 inexistente |
| 4 jogadores | 🔴 inexistente |
| Spectator | 🔴 inexistente |
| Anti-cheat | 🔴 inexistente |

**Cada conexão WebSocket recebe sua própria sessão independente.** Dois jogadores conectados jogam partidas separadas.

---

## 15. TESTES E QA

### Contagem

| Suite | Arquivos | Testes | Estado |
|-------|----------|--------|--------|
| unit | 16 | 136 | ✅ PASS |
| simulation | 10 | 42 | ✅ PASS |
| integration | 4 | 17 | ✅ PASS |
| architecture | 3 | 61 | ✅ PASS |
| contracts | 2 | 6 | ✅ PASS |
| determinism | 2 | 6 | ✅ PASS |
| orders | 1 | 6 | ✅ PASS |
| invariants | 1 | 6 | ✅ PASS |
| fuzz | 0 | 0 | ⚪ fast-check instalado, não usado |
| e2e (Playwright) | 14 specs | — | ✅ specs definidos |
| **TOTAL** | **53** | **280** | **✅ TODOS PASSANDO** |

### O que é testado

- ECS lifecycle, fixed timestep, system pipeline
- Combat (ATTACK, HOLD, ATTACK_MOVE, cooldown, death, mutual kill)
- Victory/draw/tick-limit, surrender, player state
- Determinism (golden hash, replay, cross-instance, cross-browser)
- Commands (schema, atomicity, ownership, validation)
- Orders (lifecycle completa)
- Serialization (canonical encoding round-trips)
- Architecture barriers (isolation, dependencies)
- Renderer pure functions (autotile, terrain, interpolation, HP bar)

### O que NÃO tem testes

- AI package
- Audio package
- Pathfinding package
- Server WebSocket transport
- React components
- Multi-player command interleaving
- Visual regression / screenshot testing
- Performance benchmarks formais

---

## 16. VALIDAÇÃO AUTOMÁTICA

| Comando | O que valida | Pode ser automatizado |
|---------|-------------|----------------------|
| `pnpm run typecheck` | TypeScript errors | ✅ |
| `pnpm run lint` | Code style (Biome) | ✅ |
| `pnpm run test:unit` | Pure function correctness | ✅ |
| `pnpm run test:integration` | Multi-component flows | ✅ |
| `pnpm run test:simulation` | Core simulation behavior | ✅ |
| `pnpm run test:contracts` | Command contracts | ✅ |
| `pnpm run test:orders` | Order lifecycle | ✅ |
| `pnpm run test:determinism` | Cross-instance determinism | ✅ |
| `pnpm run test:invariants` | Central invariant checks | ✅ |
| `pnpm run test:architecture` | Package isolation | ✅ |
| `pnpm run test:e2e` | Browser gameplay (Chromium) | ✅ |
| `pnpm run build` | Full build | ✅ |
| `pnpm run verify` | All of the above | ✅ |

**O que NÃO pode ser validado automaticamente:**
- Qualidade visual (sprites, animações, efeitos)
- Experiência do usuário (game feel)
- Performance percebida pelo jogador
- Balanceamento de combate
- Adequação do design

---

## 17. PERFORMANCE

| Aspecto | Estado | Evidência |
|---------|--------|-----------|
| FPS | 🟡 Stress test existe mas sem números registrados | `apps/web/src/sprites/StressView.tsx` (até 10k sprites) |
| Entidades suportadas | 🟡 Teste visual até 5000 no Sprite Lab | `tests/e2e/renderer-perf.spec.ts` |
| Pathfinding | N/A | Sem pathfinding |
| Renderização | 🟡 Medição existe mas sem gate de performance | `tests/e2e/renderer-perf.spec.ts` |
| Memory | 🔴 sem monitoramento | — |
| Network | 🔴 sem benchmarks | — |
| Mobile/browser | 🔴 sem testes | — |

**Não existem benchmarks formais ou números de performance registrados.**

---

## 18. SEGURANÇA / ROBUSTEZ

| Aspecto | Estado |
|---------|--------|
| Validação de input | ✅ commands validated atomically (validate-units.ts) |
| Autoridade | ✅ server-authoritative, client-only-rendering |
| Cheating | 🟡 architecture prevents client-side mutation, but no anti-cheat |
| Exploits óbvios | 🟡 MAX_UNITS_PER_COMMAND=256 limit exists |
| Estado inválido | ✅ invariant checker runs every tick |
| Race conditions | 🟡 single-writer model prevents most; no network races tested |
| Networking | 🔴 no rate limiting, no backpressure |
| Persistência | 🔴 sem persistência |
| Tratamento de erros | ✅ CommandRejectedError with codes |
| Crash recovery | 🔴 sem reconexão |

---

## 19. ASSETS

### Final/Real

| Asset | Tipo |
|-------|------|
| Unit sprites (blue/red/purple/yellow × pawn/warrior/archer × idle/run/attack) | Strip animations |
| Terrain tileset (5 palettes, 9x6 atlas) | Tileset |
| Water + animated foam | Strip |
| Decorations (bush, tree, rock, cloud, etc.) | Mixed |

### Provisório

| Asset | Nota |
|-------|------|
| Pawn attack animation (`interact_axe`) | Substituto temporário |

### Placeholder

| Asset | Nota |
|-------|------|
| Units sem art assets | Colored circles (fallback) |

### No Manifest mas NÃO Usado

| Asset | Tipo |
|-------|------|
| Building sprites (4 facções × 8 types) | Static |
| FX sprites (explosion, dust, fire, water_splash) | Strips |
| UI assets (panels, buttons, banners, cursors, avatars, icons) | Mixed |
| Lancer/Monk unit sprites | Strips |
| Resource sprites (gold, wood, meat, sheep) | Strips/static |

---

## 20. DOCUMENTAÇÃO

### Existente

| Documento | Linhas | Estado |
|-----------|--------|--------|
| README.md | 151 | Atualizado |
| docs/master-plan.md | 2693 | Completo |
| docs/engineering-standard.md | 247 | Atualizado |
| docs/architecture.md | — | Atualizado |
| docs/simulation.md | — | Existe |
| docs/commands.md | — | Existe |
| docs/game-design.md | — | Existe |
| docs/adr/ (15 ADRs) | — | 13 accepted, 2 superseded |
| docs/specs/ (10 specs) | — | Completo |
| docs/postmortems/ (5 postmortems) | — | Bug Response Protocol seguido |
| docs/testing/manual-smoke.md | — | Existe |
| docs/tasks/todo.md | — | Existe |
| AGENTS.md | — | Atualizado |

### Documentação Desatualizada ou Contraditória

- Pipeline descrita como 19 steps no master plan, mas apenas 6 existem (esperado para fase atual)
- game-data descrito como "declarative content" mas é placeholder
- ~~`tests/regression/` vazio mas descrito como infraestrutura para testes de regressão~~ resolvido: suíte removida; regressões co-localizadas nos suites que possuem o comportamento (ADR-016)

---

## 21. TODO REAL

### P0 — BLOQUEIA O MVP

Sem isso não existe jogo.

1. **Sistema de Economia** — Mineral + Energy, coleta, depósito, wallet funcional (Phase 2)
2. **Construção** — Base, Barracks, placement, build time, prerequisites (Phase 2)
3. **Produção** — Training queue, produce units, supply (Phase 2)
4. **Unidades de Trabalho** — Worker que coleta e constrói (Phase 2)
5. **AI básica** — Bot que coleta, constrói, e ataca (Phase 5)
6. **Condição de Vitória** — Mais do que "eliminação" — precisa de Base destruction (Phase 2)
7. **Pelo menos 2 unidades por facção** — Soldado + worker mínimo (Phase 4A)

### P1 — NECESSÁRIO PARA UM MVP BOM

Importante para lançar, mas não bloqueia protótipo.

1. **Pathfinding A*** — Unidades precisam desviar de obstáculos (Phase 3)
2. **Fog of War** — RTS sem fog é incompleto (Phase 3)
3. **Minimap** — UX essencial para RTS (Phase 8)
4. **Collision** — Unidades não podem se sobrepor (Phase 3)
5. **Segunda facção** — Vanguard + Nexus (Phase 4A)
6. **Áudio básico** — Feedback de combate e UI (Phase 9)
7. **Replay** — Para testes e sharing (Phase 7)

### P2 — PÓS-MVP

1. Room lifecycle / multiplayer real (Phase 6)
2. 8 unidades por facção (Phase 4B)
3. Abilities (Brace, Overclock)
4. Research / upgrades
5. projectiles / AoE
6. Balance tooling
7. Deploy / hosting

### P3 — NICE TO HAVE

1. Spectator mode
2. Anti-cheat
3. Mobile support
4. Tutorial / onboarding
5. Context menus
6. Animated death sequences
7. Particle system
8. Música

---

## 22. DEFINIÇÃO DO MVP REAL

> "Qual é a menor versão deste RTS que já pode ser considerada um jogo de verdade?"

### MVP Mínimo

| Aspecto | Especificação |
|---------|--------------|
| Mapas | 1 mapa competitivo (32×32 ou 64×64) |
| Facções | 1 facção (Vanguard) |
| Unidades | 3 (Worker + Soldier + Ranger) |
| Estruturas | 3 (Base + Barracks + Supply) |
| Recursos | 1 (Mineral) — Energy pode ser adiada |
| IA | Bot que coleta, constrói, produz, e ataca |
| Condição de vitória | Destruir Base inimiga |
| Duração | 5-15 minutos |
| Modo | Single-player vs AI |
| UI | HUD funcional (resources, selection, commands, minimap) |
| Áudio | SFX básico de combate |
| Arte | sprites existentes são suficientes |
| QA | Determinism tests + core gameplay tests |

---

## 23. DISTÂNCIA ATÉ O MVP

| Sistema | Estado Atual | Trabalho Restante | Bloqueia MVP? |
|---------|-------------|-------------------|---------------|
| Core simulation | ✅ Completo | Economia + produção | SIM |
| Units | 🟡 3 tipos básicos | Worker + 2-3 mais | SIM |
| Combat | ✅ Funcional | Projectiles, armor (pode adiar) | NÃO |
| Economy | 🔴 Nada | Coleta, deposit, wallet | SIM |
| Buildings | 🔴 Nada | Base, Barracks, Supply | SIM |
| AI | 🔴 Nada | Strategic + tactical bot | SIM |
| Map | 🟡 32×32 básico | Resource nodes, spawn | PARCIAL |
| UI | 🟡 HUD funcional | Resources display, minimap, build menu | SIM |
| Rendering | ✅ Funcional | Building sprites, projectiles (adiar) | NÃO |
| Audio/VFX | 🔴 Nada | SFX básico | NÃO |
| Multiplayer | 🔴 Nada | Pode adiar para pós-MVP | NÃO |
| QA | ✅ Forte | Expandir para novos sistemas | NÃO |
| Deployment | 🔴 Nada | Dev server funciona | NÃO |

### Maiores Blocos Restantes

1. **Economia + Produção + Construção (Phase 2)** — O maior bloco. Inclui: resource gathering, cargo system, deposit, wallet, building placement, build time, production queue, training, supply. É ~40% do trabalho restante.

2. **AI Bot (Phase 5)** — Segundo maior bloco. Strategic layer (economy, build order) + tactical layer (attack, retreat, target selection). Precisa funcionar para o jogo ser jogável.

3. **Pathfinding + Collision (Phase 3)** — Unidades precisam navegar o mapa. Sem isso, movimento é linha reta.

4. **Conteúdo (Phase 4A)** — 2 facções, 3+ unidades cada, 3+ construções, regras de combate.

5. **UI expandida** — Build menu, production panel, resource display funcional, minimap.

---

## 24. COMPLEXIDADE DO PROJETO

### O Projeto Atual é:

**Vertical slice funcional com core simulation completo.**

Não é protótipo (tem arquitetura madura e testes robustos). Não é MVP parcial (falta economia, construção, produção, AI). É uma **base sólida com gameplay limitado** — o "engine" está pronto, mas o "jogo" ainda não existe.

### O que está superengenheirado para o estágio atual

1. **19-step frozen pipeline** — ADR-013 define 19 steps mas apenas 6 existem. A infraestrutura para 13 sistemas inexistentes增加了 complexidade sem benefício imediato.

2. **Architecture barrier tests** — 61 testes verificando isolamento de packages que são na sua maioria placeholders.

3. **Canonical binary serialization** — Codec UTF-8 custom, presence flags, big-endian — para um jogo que ainda não tem replay.

4. **5 test suites especializadas** — contracts, orders, determinism, invariants, architecture — para um core de ~5000 linhas.

5. **15 ADRs** — Decision records excelentes, mas 2 já foram superseded e o projeto tem 2 semanas.

6. **Supply-chain hardening** — minimumReleaseAge, commitlint, husky — para um projeto privado em desenvolvimento.

### O que está subdesenvolvido em relação ao objetivo

1. **Zero economia** — RTS sem economy não é RTS
2. **Zero construção** — Metade do gameplay ausente
3. **Zero AI** — Impossível jogar sem oponente
4. **Zero pathfinding** — Unidades caminham em linha reta
5. **Zero multiplayer** — O objetivo final do projeto
6. **Zero áudio** — Sem feedback sonoro
7. **game-data vazio** — Toda a informação de design está hardcoded

---

## 25. RISCO DE OVERENGINEERING

| Caso | Classificação | Recomendação | Explicação |
|------|--------------|-------------|------------|
| Frozen 19-step pipeline | SIMPLIFICAR | Ter apenas os 6 steps ativos, adicionar novos quando implementados | A indenteria para 13 steps inexistentes não traz valor |
| Canonical binary codec | MANTER | É necessário para determinismo e replay | Bem implementado, não é excesso |
| 61 architecture barrier tests | SIMPLIFICAR | Reduzir para testes dos packages que têm código real | Testa isolamento de packages vazios |
| 15 ADRs | MANTER | São documentação valiosa | Não adiciona complexidade ao código |
| Supply-chain hardening | SIMPLIFICAR | Adiar para mais perto do launch | minimumReleaseAge é prematuro para dev |
| Custom ECS | MANTER | Leve e adequado | Não é genérico demais |
| 5 test suites especializadas | MANTER | Cobrem aspectos importantes do core | Cada uma tem propósito claro |
| Protocolo de postmortem | MANTER | Processo importante | Não adiciona complexidade ao código |
| Engineering standard extenso | SIMPLIFICAR | Muitas regras para poucas pessoas | Pode ser simplificado sem perder valor |

---

## 26. CAMINHO MAIS CURTO PARA LANÇAMENTO

### FASE 1 — Economia e Produção (Phase 2 do master plan)
- **Objetivo:** Jogador pode coletar recursos, construir, e produzir unidades
- **Funcionalidades:** Resource gathering, wallet, Base + Barracks, production queue, worker unit
- **Dependências:** Nenhuma (simulation core está pronto)
- **Testes:** Economy system tests, production tests, building placement tests
- **Critério DONE:** Jogador pode coletar mineral, construir Barracks, produzir Soldado

### FASE 2 — AI Básica (Phase 5 simplificada)
- **Objetivo:** Bot que joga contra o jogador
- **Funcionalidades:** Build order, resource management, produce units, send attack
- **Dependências:** Phase 1 (precisa de economy e units)
- **Testes:** Self-play tests (100 matches)
- **Critério DONE:** Bot coleta, constrói, produz, e ataca de forma funcional

### FASE 3 — Pathfinding e Movement (Phase 3 simplificada)
- **Objetivo:** Unidades navegam o mapa adequadamente
- **Funcionalidades:** A* pathfinding, collision, group movement
- **Dependências:** Nenhuma
- **Testes:** Path finding tests, collision tests
- **Critério DONE:** Unidades desviam de obstáculos e terreno

### FASE 4 — Conteúdo (Phase 4A simplificada)
- **Objetivo:** 1 facção completa, jogo jogável
- **Funcionalidades:** 3-4 unidades, 3 construções, upgrades básicos
- **Dependências:** Phases 1-3
- **Testes:** Balance tests, gameplay tests
- **Critério DONE:** Partida completa de 10-15 minutos contra AI

### FASE 5 — UI e Polish (Phase 8 simplificada)
- **Objetivo:** Experiência completa no browser
- **Funcionalidades:** Minimap, build menu, production panel, fog of war
- **Dependências:** Phases 1-4
- **Testes:** E2E completos
- **Critério DONE:** Jogador pode jogar partida completa sem的帮助

---

## 27. ESTIMATIVA DE ESFORÇO

| Bloco | Tamanho | O que torna difícil |
|-------|---------|-------------------|
| Economy + Production | **L** | Muitos subsystems interdependentes (gathering, cargo, deposit, wallet, building, production, supply) |
| AI Bot | **L** | Decision-making complexo, precisa ser testável, self-play validation |
| Pathfinding | **M** | A* com budget incremental, heap, spatial index, integração com ECS |
| Collision | **M** | Precisa de spatial index, resolution de overlaps |
| Conteúdo (units, buildings) | **M** | Design balance, stats, mas mecanicamente simples |
| UI expansion | **M** | Build menu, production panel, minimap — trabalho React moderado |
| Fog of War | **M** | Vision system, filtered snapshots, client-side rendering |
| Replay | **S** | Recording + playback — infraestrutura já suporta |
| Audio | **S** | Web Audio API, sound mapping — mas sem dependências de gameplay |
| Multiplayer rooms | **L** | Room lifecycle, reconnection, synchronization |
| Deploy | **S** | Containerização, hosting — mas sem complexidade de jogo |

### Tokens/Tempo de Coding AI

- Economy + Production: **ALTO** — muitos arquivos, muita lógica, muitos testes
- AI Bot: **ALTO** — lógica de decisão, muitos cenários de teste
- Pathfinding: **MÉDIO** — algoritmo clássico, mas integração复杂
- UI: **MÉDIO** — React components, menos lógica complexa
- Content: **BAIXO** — mainly data definitions
- Replay: **BAIXO** — infraestrutura existe

---

## 28. RELATÓRIO FINAL EXECUTIVO

### O que temos hoje

1. Simulação determinística server-authoritative completa com 6 sistemas, 7 comandos, 3 unidades
2. Renderer PixiJS funcional com animações, combat effects, terrain rendering
3. Server WebSocket com sessões isoladas por conexão
4. Browser client com HUD, command bar, selection, match overlay
5. 280 testes passando, 0 failures, typecheck limpo
6. 15 ADRs, 10 specs, 5 postmortems documentados
7. Sprite Lab como ferramenta de debug/visualização
8. Infrastructure madura (pnpm, vitest, biome, playwright, semantic-release)
9. Arquitetura que suporta multiplayer teoricamente
10. Determinismo verificado cross-runtime (Node ≡ Chromium)

### O que falta para jogar uma partida completa

1. Worker unit que coleta recursos
2. Sistema de economy (mineral collection, wallet)
3. Construção de Base e Barracks
4. Production queue para treinar unidades
5. AI que joga contra o jogador
6. Pathfinding para unidades navegarem
7. Condição de vitória mais rica (Base destruction)
8. UI para economy, construção, produção
9. Minimap
10. Mais unidades e construções para ter variedade

### O que falta para chamar de MVP

1. Phase 2 completa (Economy + Production)
2. Phase 5 simplificada (AI básica funcional)
3. Phase 3 simplificada (Pathfinding básico)
4. Phase 4A simplificada (1 facção com 3-4 unidades + 3 buildings)
5. Phase 8 simplificada (Minimap + UI expandida)

### O que NÃO precisamos fazer agora

1. Multiplayer rooms/sync (Phase 6) — pode ser pós-MVP
2. Replay recording (Phase 7) — pode ser pós-MVP
3. 8 unidades por facção (Phase 4B) — 3-4 são suficientes
4. Abilities (Brace, Overclock) — nice to have
5. Research/upgrades avançados — simplificar
6. Deploy infrastructure — dev server funciona
7. Mobile support — pode ser pós-MVP
8. Áudio — pode ser pós-MVP
9. Tutorial/onboarding — pode ser pós-MVP
10. Balancing tooling — pode ser pós-MVP

### Maiores riscos

1. **Scope creep** — O master plan tem 10 phases e 2693 linhas. É fácil tentar fazer tudo.
2. **Overengineering** — A infraestrutura é mais madura que o gameplay. Foco no jogo, não na engine.
3. **AI complexity** — Building a good RTS AI é um dos problemas mais difíceis. Começar simples.
4. **Economy balance** — Resource tuning é iterativo e demorado.
5. **Pathfinding performance** — A* com muitas unidades pode ser lento.

### Próximas 5 etapas

1. **Implementar Economy system** — resource nodes, worker gathering, wallet
2. **Implementar Building system** — Base + Barracks, placement, build time
3. **Implementar Production** — training queue, unit spawning
4. **Implementar AI básica** — build order + attack behavior
5. **Implementar Pathfinding** — A* com collision avoidance

### VEREDITO TÉCNICO

1. **O projeto está no caminho de virar um RTS jogável?** SIM. A base é sólida e a arquitetura é adequada. O core simulation está completo e testado.

2. **O escopo atual é razoável para um primeiro lançamento?** O escopo planejado (10 phases, 2 facções × 8 unidades) é AMPLIADO demais. Um MVP com 1 facção, 3-4 unidades, e economy básica é razoável.

3. **Existe overengineering?** PARCIALMENTE. A infraestrutura de testes e arquitetura é robusta para o estágio atual, mas não é prejudicial — é mais "prematuramente madura" do que "excessivamente complexa". Os architecture barrier tests para packages vazios e o supply-chain hardening são os casos mais claros.

4. **O que deveria ser cortado/adiado?** Multiplayer (Phase 6), Replay (Phase 7), 8 unidades/facção (Phase 4B), abilities, research avançado, áudio, mobile, deploy. Focar em: Economy → Production → AI → Pathfinding → UI.

5. **Qual é o maior gargalo atual?** **Economy + Production (Phase 2).** É o maior bloco de trabalho, tem mais subsystems interdependentes, e é absolutamente necessário para o jogo existir.

6. **Qual deveria ser o próximo bloco de implementação?** **Economy system** — resource gathering, wallet, worker unit. É a fundação para tudo que vem depois (construção, produção, AI).

---

# MACHINE-READABLE SUMMARY

```json
{
  "project_stage": "Vertical slice with complete simulation core, no gameplay loop",
  "implemented_systems": [
    "ECS engine (7 components, world CRUD)",
    "Fixed timestep (20 ticks/s)",
    "Deterministic simulation (xoshiro128**, SHA-256, fixed-point)",
    "7 commands (MOVE, STOP, HOLD, PATROL, ATTACK, ATTACK_MOVE, SURRENDER)",
    "6 pipeline systems (orders, movement, combat, death, victory, invariants)",
    "3 unit types (pawn, warrior, archer)",
    "Combat with simultaneous death",
    "Victory/draw/tick-limit",
    "Snapshot/hash/export/restore",
    "Deterministic formation",
    "PixiJS renderer (animated sprites, terrain, effects, HP bars)",
    "Unit selection (click + box)",
    "Command bar (all 7 commands)",
    "Match overlay (victory/defeat/draw)",
    "WebSocket server (isolated sessions)",
    "Browser client (React HUD + PixiJS canvas)",
    "280 passing tests (unit, integration, simulation, contracts, orders, determinism, invariants, architecture)",
    "14 E2E Playwright specs",
    "Architecture barrier tests (3 suites)"
  ],
  "partial_systems": [
    "game-data (only competitive map, no unit/building definitions)",
    "Protocol (4 message types, no room/multiplayer messages)",
    "Server (demo sessions only, no room lifecycle)",
    "Renderer (no minimap, no fog, no building rendering)",
    "HUD (resource chips exist but always null)"
  ],
  "missing_mvp_systems": [
    "Economy (resource gathering, deposit, wallet)",
    "Construction (building placement, build time)",
    "Production (training queue, unit spawning)",
    "Supply management",
    "Worker unit type",
    "AI bot (strategic + tactical)",
    "Pathfinding (A*)",
    "Collision/avoidance",
    "Fog of war",
    "Minimap",
    "Build menu UI",
    "Production panel UI"
  ],
  "post_mvp_systems": [
    "Multiplayer rooms/sync",
    "Replay recording/playback",
    "8 units per faction (16 total)",
    "2 factions (Vanguard + Nexus)",
    "Abilities (Brace, Overclock)",
    "Research/upgrades",
    "Projectiles/AoE",
    "Audio",
    "Deploy/hosting",
    "Mobile support",
    "Tutorial/onboarding",
    "Spectator mode",
    "Anti-cheat"
  ],
  "critical_blockers": [
    "No economy system",
    "No construction system",
    "No production system",
    "No AI opponent",
    "No pathfinding",
    "No worker unit"
  ],
  "test_count": 280,
  "passing_tests": 280,
  "failing_tests": 0,
  "e2e_spec_count": 14,
  "mvp_definition": {
    "maps": 1,
    "factions": 1,
    "units_per_faction": "3-4 (Worker + Soldier + Ranger + optional)",
    "buildings": "3 (Base + Barracks + Supply)",
    "resources": "1 (Mineral)",
    "ai": "Basic bot (build order + attack)",
    "victory_condition": "Destroy enemy Base",
    "duration": "5-15 minutes",
    "mode": "Single-player vs AI",
    "ui": "HUD + minimap + build menu + production panel",
    "audio": "Basic combat SFX",
    "art": "Existing sprite assets sufficient"
  },
  "next_steps": [
    "Implement Economy system (resource gathering, wallet)",
    "Implement Building system (Base + Barracks, placement)",
    "Implement Production system (training queue)",
    "Implement basic AI bot",
    "Implement Pathfinding (A*)"
  ]
}
```
