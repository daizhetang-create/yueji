import test from 'node:test'
import assert from 'node:assert/strict'
import { calculateSettlement } from './settlement.mjs'

test('light meditation plan refunds the completed share only', () => {
  assert.deepEqual(calculateSettlement({ depositFen: 990, completedCount: 3, targetCount: 5 }), {
    depositFen: 990,
    targetCount: 5,
    completedCount: 3,
    missedCount: 2,
    refundFen: 594,
    retainedFen: 396,
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
  })
})
