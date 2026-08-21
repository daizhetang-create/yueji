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
  }
}
