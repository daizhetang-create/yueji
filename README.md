# 约己 · YUEJI

把目标缩成今天的一件事。做完就结束。

- 公开网站：<https://daizhetang-create.github.io/yueji/>
- GitHub：<https://github.com/daizhetang-create/yueji>

## 当前已经具备

- 极简网页 / PWA：今天、记录、我的；一键完成、免输入添加目标、本机持久化、添加到主屏幕。
- 原生微信小程序工程：与网页一致的三页结构，可直接导入微信开发者工具。
- 微信支付服务端链路：小程序登录、JSAPI 承诺金下单、客户端调起支付、回调验签解密、内部退款接口。
- 支付 RSA 与 API v3 AES-GCM 自动测试、GitHub Pages 自动部署。

真实收款不会使用演示数据；必须先填入已认证小程序和微信支付商户参数。

## 工程结构

```text
src/        网页 / PWA
miniapp/    原生微信小程序
server/     微信登录、支付与退款服务
docs/       产品、支付、自动打卡与研究文档
```

## 本地运行

```powershell
npm install
npm run dev
```

支付服务：

```powershell
Copy-Item .env.example .env
npm run server
```

完整检查：

```powershell
npm run check
```

## 文档

- [今天能完成什么，以及后续上架顺序](./docs/01-产品与上线路线.md)
- [全球竞品与学术证据](./docs/02-全球竞品与学术证据.md)
- [微信支付承诺金接入](./docs/03-微信支付接入.md)
- [原生 App 自动打卡](./docs/04-自动打卡与原生App.md)
