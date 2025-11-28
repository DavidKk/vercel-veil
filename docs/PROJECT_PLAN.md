# vercel-veil 项目规划备忘

## 背景

- `cf-feed-bridge` 与 `cf-veil` 长期运行在 Cloudflare Workers，上下游越来越多，维护成本高。
- 计划将所有桥接/代理逻辑整合到统一的 Vercel 平台，获得更一致的部署、调试与配置体验。

## 项目定位

- 作为私有服务对外暴露的“薄网关”，统一承接 \*arr、Navidrome 等服务的 Webhook/REST 接口。
- 提供单一公共 API，内部根据配置路由到不同私有服务，并可做必要的格式转换。
- 对后续新增的桥接需求（通知、转码、代理）提供可复用的基础框架。

## 核心目标

1. 废弃 Cloudflare Worker 运行面，但暂不删除旧仓库，先双轨迁移。
2. 所有对外调用必须携带自定义 `TOKENHEADER`，内部抽象统一鉴权模块，便于扩展 2FA/白名单。
3. 提供一个需要登录 + 2FA 的轻量 Web 管理面板，对邮件模板、Webhook 目标等配置项进行管理。
4. 保证对音乐相关 API（Navidrome 或其他替代）的唯一出口，后端可灵活切换底层服务。
5. 建立清晰的配置与 Secrets 管理规范，便于后续服务快速接入。

## 功能模块

- `API Gateway`：Vercel Functions/Edge Functions，按业务模块分目录（`music`, `arr-webhooks`, `notifications` 等）。
- `Service Clients`：封装与私有服务交互的 SDK（签名、请求重试、payload 适配）。
- `Auth & Security`：Token 校验、可选 IP 白名单、HMAC；复用 `vercel-2fa` 的 2FA 方案为管理端提供安全登录。
- `Config Center`：Web 配置界面 + Server Actions，存储在 Vercel 环境变量/Edge Config/KV；支持邮件模板管理。
- `Observability`（后续）：简单日志/告警输出，方便排查 webhook 失败。

## 技术栈与运行环境

- 平台：Vercel（Node/Edge Runtime，依据依赖选择）。
- 前端：Next.js App Router + Tailwind（沿用既有项目规范）。
- 服务端：TypeScript、Serverless Functions、可能的 Edge Config/KV/Upstash。
- 测试：Jest/Playwright（与仓库既有脚手架一致）。

## 迁移策略

1. 盘点 `cf-feed-bridge` 与 `cf-veil` 现有路由、Secrets、依赖的第三方服务。
2. 为每个旧控制器在 `vercel-veil` 中创建对应 API，重写 Worker 特有 API 为 Node/Fetch 兼容实现。
3. 搭建 Token 校验中间件并在所有接口启用；同时在 Web 面板中提供 Token 管理入口。
4. 按模块迁移并逐步切流：Webhook -> 音乐 API -> 其他代理/通知。
5. 迁移完成并验证稳定后，再评估旧仓库的归档或删除。

## 开发里程碑（建议）

1. 初始化 `vercel-veil` 基础结构、依赖与部署脚本。
2. 实现 Token 鉴权、基础日志及健康检查接口。
3. 搭建登录 + 2FA 的 Web 管理端，支持最小配置集（邮件模板、Webhook 目标）。
4. 迁移 ARR 系列 Webhook，并增加单元/集成测试。
5. 迁移 Navidrome（或音乐 API）代理层，确保外部接口保持一致。
6. 完成剩余桥接/通知功能，建立监控与回滚策略。

## 待确认事项

- 是否需要持久化（数据库/队列）来支撑失败重试、历史记录？如需要，需尽早选型。
- `TOKENHEADER` 的具体命名、生成与轮换策略。
- Web 面板未来是否需要管理多用户权限。
- 配置存储介质（环境变量、Edge Config、KV、外部数据库）的最终选择。
- 是否需要统一的告警/通知（邮件、推送）以提示 API/Webhook 失败。

> 确认本规划后，可按上述步骤正式初始化并迭代 `vercel-veil`。
