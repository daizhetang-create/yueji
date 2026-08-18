import assert from 'node:assert/strict'
import { generateKeyPairSync } from 'node:crypto'
import test from 'node:test'
import { decryptResource, encryptResourceForTest, signPayload, verifyPayload } from './wechatpay.mjs'

test('RSA payload signing verifies with its public key', () => {
  const { privateKey, publicKey } = generateKeyPairSync('rsa', { modulusLength: 2048 })
  const payload = 'appid\n123\nnonce\nprepay_id=wx123\n'
  const signature = signPayload(payload, privateKey.export({ type: 'pkcs8', format: 'pem' }))
  assert.equal(verifyPayload(payload, signature, publicKey.export({ type: 'spki', format: 'pem' })), true)
})

test('API v3 notification resource decrypts with AES-256-GCM', () => {
  const key = '12345678901234567890123456789012'
  const resource = encryptResourceForTest({ out_trade_no: 'YJ123', trade_state: 'SUCCESS' }, key, '123456789012', 'transaction')
  assert.deepEqual(decryptResource(resource, key), { out_trade_no: 'YJ123', trade_state: 'SUCCESS' })
})
