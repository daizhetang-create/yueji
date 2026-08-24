import test from 'node:test'
import assert from 'node:assert/strict'
import { calculatePoolDistribution, calculateSettlement } from './settlement.mjs'

test('light meditation plan refunds the completed share only', () => {
  assert.deepEqual(calculateSettlement({ depositFen: 990, completedCount: 3, targetCount: 5 }), {
    depositFen: 990,
    targetCount: 5,
    completedCount: 3,
    missedCount: 2,
    refundFen: 594,
    retainedFen: 396,
    poolContributionFen: 396,
  })
})

test('completion is capped and a fully completed plan refunds every fen', () => {
  assert.deepEqual(calculateSettlement({ depositFen: 1990, completedCount: 7, targetCount: 3 }), {
    depositFen: 1990,
    targetCount: 3,
    completedCount: 3,
    missedCount: 0,
    refundFen: 1990,
    retainedFen: 0,
    poolContributionFen: 0,
  })
})

test('public pool preview splits equally and freezes cents that cannot be split fairly', () => {
  assert.deepEqual(calculatePoolDistribution({ poolFen: 1000, eligibleParticipantIds: ['a', 'b', 'c'] }), {
    poolFen: 1000,
    eligibleCount: 3,
    shareFen: 333,
    distributableFen: 999,
    frozenRemainderFen: 1,
    allocations: [
      { participantId: 'a', rewardFen: 333 },
      { participantId: 'b', rewardFen: 333 },
      { participantId: 'c', rewardFen: 333 },
    ],
    state: 'PREVIEW',
  })
})

test('public pool preview deduplicates eligibility and never auto-rolls an empty pool', () => {
  assert.deepEqual(calculatePoolDistribution({ poolFen: 990, eligibleParticipantIds: [] }), {
    poolFen: 990,
    eligibleCount: 0,
    shareFen: 0,
    distributableFen: 0,
    frozenRemainderFen: 990,
    allocations: [],
    state: 'REVIEW_REQUIRED',
  })

  assert.equal(calculatePoolDistribution({ poolFen: 990, eligibleParticipantIds: ['a', 'a'] }).eligibleCount, 1)
})
