const COMMITMENTS = new Map([
  ['seven-day-light', { id: 'seven-day-light', level: 'light', description: '约己七日约 · 轻约', days: 7, depositFen: 990 }],
  ['seven-day-steady', { id: 'seven-day-steady', level: 'steady', description: '约己七日约 · 认真约', days: 7, depositFen: 1990 }],
  ['seven-day-strong', { id: 'seven-day-strong', level: 'strong', description: '约己七日约 · 强约', days: 7, depositFen: 2990 }],
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
