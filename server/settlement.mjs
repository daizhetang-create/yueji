export function calculateSettlement({ depositFen, completedCount, targetCount }) {
  if (!Number.isInteger(depositFen) || depositFen < 0) throw new Error('承诺金金额不合法')
  if (!Number.isInteger(targetCount) || targetCount <= 0) throw new Error('目标次数不合法')
  if (!Number.isInteger(completedCount) || completedCount < 0) throw new Error('完成次数不合法')

  const creditedCount = Math.min(completedCount, targetCount)
  const refundFen = Math.floor((depositFen * creditedCount) / targetCount)
  return {
    depositFen,
    targetCount,
    completedCount: creditedCount,
    missedCount: targetCount - creditedCount,
    refundFen,
    retainedFen: depositFen - refundFen,
    poolContributionFen: depositFen - refundFen,
  }
}

/**
 * 共同约池只负责生成可审计的分配预览，不触发任何付款。
 * 真实奖励必须走独立的持久化账本、申诉冻结与商户付款链路。
 */
export function calculatePoolDistribution({ poolFen, eligibleParticipantIds }) {
  if (!Number.isInteger(poolFen) || poolFen < 0) throw new Error('约池金额不合法')
  if (!Array.isArray(eligibleParticipantIds)) throw new Error('共享资格名单不合法')

  const participantIds = [...new Set(eligibleParticipantIds)]
  if (participantIds.some((id) => typeof id !== 'string' || !id.trim())) {
    throw new Error('共享资格用户不合法')
  }

  if (participantIds.length === 0) {
    return {
      poolFen,
      eligibleCount: 0,
      shareFen: 0,
      distributableFen: 0,
      frozenRemainderFen: poolFen,
      allocations: [],
      state: 'REVIEW_REQUIRED',
    }
  }

  const shareFen = Math.floor(poolFen / participantIds.length)
  const distributableFen = shareFen * participantIds.length
  return {
    poolFen,
    eligibleCount: participantIds.length,
    shareFen,
    distributableFen,
    frozenRemainderFen: poolFen - distributableFen,
    allocations: participantIds.map((participantId) => ({ participantId, rewardFen: shareFen })),
    state: 'PREVIEW',
  }
}
