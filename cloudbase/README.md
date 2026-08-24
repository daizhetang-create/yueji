# 约己 CloudBase 接入

## 目标结构

- `yueji-data`：用户、计划和打卡数据；只通过云函数访问数据库。
- CloudBase 集成中心生成的 `pay-common`：微信下单、查单、退款和回调。
- `users / plans / checkins / reflections / orders / settlements / audit_logs`：当前可用数据结构。
- `checkin_events / pool_cycles / pool_entries / reward_payouts`：共同约池真实化之前的预留审计结构；默认不启用真实付款。

## 当前套餐路线（2026-08-21）

- 开发环境：上海地域、`yueji-dev`、免费体验版、**云数据库**（不是 PostgreSQL）。
- 免费体验版为 0 元、3000 资源点/月，控制台每次可续 6 个月且不自动续费；只作为开发环境。
- CloudBase 官方“微信生态连接器（微信支付-小程序）”目前仅标准版及以上提供，免费版和个人版不包含。首版不为连接器直接购买约 ¥199/月标准版。
- 正式支付优先采用公司商户号 + 自建 `yueji-pay` 云函数直连微信支付 API；上线后再把环境升级到满足超时、日志和生产保障的付费套餐。

官方价格与能力表：https://cloud.tencent.com/document/product/876/127357

## 开通后要填的两个公开标识

在 `miniapp/services/config.js` 填写：

```js
envId: 'CloudBase 环境 ID',
payFunctionName: '集成中心生成的支付函数名',
```

这里绝不能填写 AppSecret、APIv3 密钥、证书私钥或身份证/银行卡信息。

## 部署顺序

1. 用已认证的小程序 AppID 创建或关联 CloudBase 环境。
2. 创建清单中的数据库集合和索引，权限全部设为“仅管理员/云函数”；至少先创建 `users / plans / checkins / reflections`。
3. 在微信开发者工具中上传并部署 `cloudfunctions/yueji-data`，选择“云端安装依赖”。
4. 选择支付路线：标准版可在「模板与集成 → 集成中心」创建“小程序微信支付”；MVP 优先部署自建 `yueji-pay`，避免为连接器过早升级标准版。
5. 将环境 ID 和实际支付函数名填入 `miniapp/services/config.js`。
6. 在支付函数实现：服务端定价、订单落库、金额复核、幂等回调、结算退款。

## 上线硬规则

- 只接受 `levelId` 和 `trackId`，金额由服务端表映射，永远不相信客户端金额。
- `plans.state=active` 只能由“支付成功回调”创建，不能由小程序前端直接创建。
- 同一个 `outTradeNo`、支付通知 ID、`planId` 和退款单号都必须幂等。
- 结算退款金额由服务端根据有效打卡计算；客户端不能提交 `refundFen`。
- 回调先核对商户号、AppID、订单金额和 OpenID，再更新订单。
- 本金退款、约池贡献、共同奖励必须三账分开；微信原路退款不能冒充跨用户奖励付款。
- 共同奖励启用前必须具备不可覆盖打卡事件、完成证据复核、12 小时申诉冻结、持久订单、对账与幂等奖励转出。
