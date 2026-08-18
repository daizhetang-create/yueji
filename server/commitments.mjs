const COMMITMENTS = new Map([
  ['starter-seven-days', {
    id: 'starter-seven-days',
    description: '约己 7 天承诺金',
    days: 7,
    dailyStakeFen: 990,
    depositFen: 6930,
  }],
])

const orders = new Map()

export function getCommitment(id) {
  return COMMITMENTS.get(id)
}

export function rememberOrder(order) {
  orders.set(order.outTradeNo, order)
  return order
}

export function markOrderPaid(outTradeNo, transaction) {
  const order = orders.get(outTradeNo)
  if (!order) return null
  const paid = { ...order, state: 'PAID', transactionId: transaction.transaction_id, paidAt: transaction.success_time }
  orders.set(outTradeNo, paid)
  return paid
}

export function getOrder(outTradeNo) {
  return orders.get(outTradeNo)
}

export function markOrderRefunded(outTradeNo, refund) {
  const order = orders.get(outTradeNo)
  if (!order) return null
  const refunded = {
    ...order,
    state: 'REFUNDED',
    refundId: refund.refund_id,
    refundFen: refund.amount?.refund,
    refundedAt: refund.success_time,
  }
  orders.set(outTradeNo, refunded)
  return refunded
}
