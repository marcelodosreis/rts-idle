export const SEEDS = {
  unit: {
    rngGolden: 1,
    rngSameSeed: 123456,
    rngDivergenceA: 1,
    rngDivergenceB: 2,
    rngUint32: 42,
    rngExportRestore: 7,
    rngZeroGuard: 0,
    rngNextInt: 99,
    rngInvalidBounds: 1
  },
  simulation: {
    fixedTick: 1,
    deterministicPair: 42,
    divergenceA: 10,
    divergenceB: 11,
    snapshotIdentical: 1,
    snapshotRoundtrip: 5,
    snapshotContinue: 9,
    snapshotCorrupt: 3
  },
  integration: {
    moveOwn: 1,
    moveNonOwner: 2,
    moveMissing: 3,
    moveEmptyOversize: 4,
    moveFractional: 5,
    moveDeterministic: 9,
    session: 1,
    formationSpread: 1,
    formationFirstOnClick: 2,
    formationSingle: 3,
    formationDeterministic: 9
  },
  determinism: {
    replayPerTick: 123456,
    replaySnapshot: 777
  },
  e2e: {
    browserDeterminism: [1, 2, 3, 4, 5]
  }
} as const
