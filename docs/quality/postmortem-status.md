# Postmortem Status

> Gerado automaticamente por `tools/quality/postmortem-status.ts`
> Atualizado: 2026-09-20

## Resumo

| Status | Quantidade |
|--------|------------|
| open | 13 |
| closed | 2 |
| **total** | **15** |

## Detalhes

| Postmortem | Status | Classe | Barreira | Regressão |
|------------|--------|--------|----------|-----------|
| 2026-09-16-invisible-units | open | presentation | — | 1 teste(s) |
| 2026-09-16-move-rejected-fractional-coordinates | open | input-geometry | — | 1 teste(s) |
| 2026-09-16-shared-demo-session | open | isolation | — | nenhum |
| 2026-09-16-stale-server-served-old-code | open | environment | — | nenhum |
| 2026-09-16-units-stacked-at-target | closed | formation | — | 2 teste(s) |
| 2026-09-18-economy-loop-lacked-visible-feedback | open | presentation | — | 1 teste(s) |
| 2026-09-18-fallback-circle-shrinks-on-attack | open | presentation | — | 1 teste(s) |
| 2026-09-19-build-002-branch-merge-conflict | open | process-branch | — | nenhum |
| 2026-09-19-construction-placement-origin-mismatch | open | presentation | — | 3 teste(s) |
| 2026-09-19-control-click-selects-enemy-instead-of-attacking | open | input-cross-platform | — | 1 teste(s) |
| 2026-09-19-economy-anim-asserted-without-fallback-tolerance | open | convention | — | 2 teste(s) |
| 2026-09-19-economy-e2e-stale-wallet-assertion | open | completion-gate | — | 1 teste(s) |
| 2026-09-19-hud-topbar-overlap-narrow-viewport | closed | layout | — | 1 teste(s) |
| 2026-09-19-mac-trackpad-cannot-move-units | open | input-cross-platform | — | 1 teste(s) |
| 2026-09-19-renderer-economy-progress-reference-error | open | presentation | — | 1 teste(s) |

## Legenda

- **open** = bug corrigido, mas pode acontecer de novo (sem barreira de classe)
- **closed** = bug corrigido E barreira de classe existe (não volta mais)
- **Barreira** = QUAL que fornece a barreira de classe
- **Regressão** = teste(s) permanente(s) que validam o fix
