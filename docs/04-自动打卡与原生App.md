# 自动打卡与原生 App

## 核心判断

微信小程序适合登录、支付、提醒和快速打开，但不能承担系统健康数据的主要读取端。真正做到“我在常用冥想 App 里完成，约己自动知道”，需要 iOS / Android 原生应用在用户明确授权后读取系统健康数据。

## iOS

HealthKit 提供 `HKCategoryTypeIdentifierMindfulSession`，可读取写入 Apple 健康的正念会话；运动使用 `HKWorkoutTypeIdentifier`。判定流程：

1. 用户只授权读取“正念分钟”和必要的训练类型；
2. App 读取目标时段内的样本；
3. 合并重叠区间，按时区计算实际分钟；
4. 记录数据来源 App、开始/结束时间和样本 ID 的哈希；
5. 达到阈值后把“完成事件”传给服务端，不上传无关健康明细。

前提是用户常用的冥想软件确实把会话写入 Apple 健康。若没有写入，则保留一键确认或使用约己内置计时。

官方依据：[Apple HealthKit 数据类型](https://developer.apple.com/documentation/healthkit/data-types)、[mindfulSession](https://developer.apple.com/documentation/healthkit/hkcategorytypeidentifier/mindfulsession)。

## Android

Health Connect 已提供 `MindfulnessSessionRecord`，包含冥想、呼吸、音乐、运动式正念等类型，并有 `MINDFULNESS_DURATION_TOTAL` 聚合；运动使用 Exercise Session。App 必须声明读取权限，运行时请求用户授权，并检查功能是否在设备上可用。

官方依据：[Health Connect 数据类型](https://developer.android.com/health-and-fitness/health-connect/data-types)、[Track mindfulness](https://developer.android.com/health-and-fitness/health-connect/features/mindfulness)、[功能可用性](https://developer.android.com/health-and-fitness/health-connect/features/availability)。

## 技术选择

原生 App 建议使用 React Native + 必要的 Swift/Kotlin 模块：

- UI、导航、账户、约定和记录共用 TypeScript；
- HealthKit、Health Connect、后台刷新与微信 App 支付使用原生模块；
- 与小程序共享服务端 API、约定规则和支付账本，不强行共享 UI 代码。

不建议把网页放进 WebView 当 App：它不会获得可靠的健康数据后台同步，也无法达到你要求的原生手感。

## 防误判优先于防作弊

资金产品里最糟糕的不是有人偶尔手动确认，而是系统误判后扣到守约用户。因此首版按以下顺序：

1. 健康数据自动通过；
2. 数据延迟时进入 12 小时宽限，不立即结算；
3. 无数据时允许一次手动确认并标记来源；
4. 高频异常才要求复核，不对所有用户增加摩擦；
5. 申诉期间冻结结算，不能先扣后说。

## 隐私边界

- 默认只上传“是否达到阈值、分钟数、来源类型、时间窗”，不上传心率、路线和完整健康档案；
- 原始健康数据尽量留在设备；
- 权限可以单项撤回；
- 用户可删除账户与完成记录；
- 健康授权和支付授权必须分开，不以拒绝非必要健康权限阻止基本打卡。
