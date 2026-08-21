# 约己微信小程序

如果还没有微信小程序账号，先保留本机 `project.config.json` 中的 `touristappid`，可直接完成界面和本地交互预览；不要为了拿 AppID 仓促注册不支持正式支付的个人主体账号。

1. 在微信公众平台注册并认证小程序，把 `project.config.example.json` 复制为 `project.config.json`，填入 AppID。
2. 用该小程序创建或关联 CloudBase 环境，部署 `cloudfunctions/yueji-data`。
3. 在 CloudBase 集成中心创建“小程序微信支付”，记录自动生成的支付云函数名。
4. 在 `services/config.js` 填入公开的 `envId` 和 `payFunctionName`。
5. 使用微信开发者工具导入本目录；配置已指向相邻的 `../cloudfunctions/` 云函数目录。最后用真机测试，模拟器不能完成真实微信支付。

小程序首发使用「一次支付七日约总承诺金（¥9.9 / ¥19.9 / ¥29.9）→ 服务端按有效完成份额结算 → 周期结束统一原路退款」；不把预约扣费伪装成可直接开通的通用自动扣款。

完整 CloudBase 步骤见 `../cloudbase/README.md`，产品与结算依据见 `../planning/05-七日约机制与年度执行路线.md`。

第一次从零开通时，先看 `../planning/06-小程序从零开通清单.md`。
