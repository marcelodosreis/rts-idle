# Postmortem Status

> Gerado automaticamente por `tools/quality/postmortem-status.ts`
> Atualizado: 2026-09-21

## Resumo

| Status | Quantidade |
|--------|------------|
| open | 10 |
| closed | 12 |
| **total** | **22** |

## Detalhes

| Postmortem | Status | Classe | Barreira | Regressão |
|------------|--------|--------|----------|-----------|
| 2026-09-16-invisible-units | closed | presentation | — | 1 teste(s) |
| 2026-09-16-move-rejected-fractional-coordinates | closed | input-geometry | — | 1 teste(s) |
| 2026-09-16-shared-demo-session | open | isolation | — | nenhum |
| 2026-09-16-stale-server-served-old-code | open | environment | — | nenhum |
| 2026-09-16-units-stacked-at-target | closed | formation | — | 2 teste(s) |
| 2026-09-18-economy-loop-lacked-visible-feedback | closed | presentation | — | 1 teste(s) |
| 2026-09-18-fallback-circle-shrinks-on-attack | closed | presentation | — | 1 teste(s) |
| 2026-09-19-build-002-branch-merge-conflict | open | process-branch | — | nenhum |
| 2026-09-19-construction-placement-origin-mismatch | closed | presentation | — | 3 teste(s) |
| 2026-09-19-control-click-selects-enemy-instead-of-attacking | closed | input-cross-platform | — | 1 teste(s) |
| 2026-09-19-economy-anim-asserted-without-fallback-tolerance | closed | convention | — | 2 teste(s) |
| 2026-09-19-economy-e2e-stale-wallet-assertion | closed | completion-gate | — | 1 teste(s) |
| 2026-09-19-hud-topbar-overlap-narrow-viewport | closed | layout | — | 1 teste(s) |
| 2026-09-19-mac-trackpad-cannot-move-units | closed | input-cross-platform | — | 1 teste(s) |
| 2026-09-19-renderer-economy-progress-reference-error | closed | presentation | — | 1 teste(s) |
| 2026-09-20-building-e2e-selected-initial-base | open | coverage | — | 1 teste(s) |
| 2026-09-20-building-reassignment-persistence | open | coverage | — | 1 teste(s) |
| 2026-09-20-construction-e2e-stale-work-point-assertion | open | completion-gate | — | 1 teste(s) |
| 2026-09-20-construction-nearest-edge | open | presentation | — | 3 teste(s) |
| 2026-09-20-construction-work-point-visual-distance | open | presentation | — | 2 teste(s) |
| 2026-09-20-postmortem-metadata-contract-violation | open | convention | — | 1 teste(s) |
| 2026-09-20-renderer-snapshot-before-mount | open | presentation | — | 1 teste(s) |

## Legenda

- **open** = bug corrigido, mas pode acontecer de novo (sem barreira de classe)
- **closed** = bug corrigido E barreira de classe existe (não volta mais)
- **Barreira** = QUAL que fornece a barreira de classe
- **Regressão** = teste(s) permanente(s) que validam o fix
