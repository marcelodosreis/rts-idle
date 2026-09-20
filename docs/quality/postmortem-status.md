# Postmortem Status

> Gerado automaticamente por `tools/quality/postmortem-status.ts`
> Atualizado: 2026-09-20

## Resumo

| Status | Quantidade |
|--------|------------|
| open | 0 |
| closed | 15 |
| **total** | **15** |

## Detalhes

| Postmortem | Status | Classe | Barreira | Regressão |
|------------|--------|--------|----------|-----------|
| 2026-09-16-invisible-units | closed | presentation | regression-units-visible.spec.ts | 1 teste(s) |
| 2026-09-16-move-rejected-fractional-coordinates | closed | input-geometry | regression-move-fractional-coords.spec.ts | 1 teste(s) |
| 2026-09-16-shared-demo-session | closed | isolation | E2E suite (--workers=6) validates per-session isolation | nenhum |
| 2026-09-16-stale-server-served-old-code | closed | environment | tsx watch dev script prevents stale servers | nenhum |
| 2026-09-16-units-stacked-at-target | closed | formation | — | 2 teste(s) |
| 2026-09-18-economy-loop-lacked-visible-feedback | closed | presentation | economy-playable.spec.ts | 1 teste(s) |
| 2026-09-18-fallback-circle-shrinks-on-attack | closed | presentation | sprite-fallback.spec.ts | 1 teste(s) |
| 2026-09-19-build-002-branch-merge-conflict | closed | process-branch | RFC-002 branching procedure with merge-base check | nenhum |
| 2026-09-19-construction-placement-origin-mismatch | closed | presentation | world-object-layer.test.ts + building-construction.test.ts + building-hud.spec.ts | 3 teste(s) |
| 2026-09-19-control-click-selects-enemy-instead-of-attacking | closed | input-cross-platform | control-click-attack.spec.ts | 1 teste(s) |
| 2026-09-19-economy-anim-asserted-without-fallback-tolerance | closed | convention | unit-economy.test.ts + economy-playable.spec.ts fallback-tolerant assertions | 2 teste(s) |
| 2026-09-19-economy-e2e-stale-wallet-assertion | closed | completion-gate | economy-playable.spec.ts baseline-relative wallet assertions | 1 teste(s) |
| 2026-09-19-hud-topbar-overlap-narrow-viewport | closed | layout | — | 1 teste(s) |
| 2026-09-19-mac-trackpad-cannot-move-units | closed | input-cross-platform | control-click-attack.spec.ts | 1 teste(s) |
| 2026-09-19-renderer-economy-progress-reference-error | closed | presentation | unit-economy.test.ts | 1 teste(s) |

## Legenda

- **open** = bug corrigido, mas pode acontecer de novo (sem barreira de classe)
- **closed** = bug corrigido E barreira de classe existe (não volta mais)
- **Barreira** = QUAL que fornece a barreira de classe
- **Regressão** = teste(s) permanente(s) que validam o fix
