[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT) [![English](https://img.shields.io/badge/docs-English-green?style=flat-square&logo=docs)](./README.md)

# vercel-veil

`vercel-veil` 是一个运行在 Vercel 上的轻量级网关服务。它接收来自 \*arr 系列应用（Sonarr/Radarr）的 Webhook，处理并发送通过 Resend 的格式化邮件通知，支持自定义 HTML 模板。

## 功能特性

- **Token 保护的 API**：所有外部接口都需要自定义 Header Token 以确保安全访问。
- **Sonarr/Radarr Webhook 支持**：专用端点（`POST /api/webhooks/sonarr` 和 `POST /api/webhooks/radarr`）接收来自 Sonarr 和 Radarr 的原生 Webhook JSON。
- **基于模板的邮件通知**：使用可自定义的 HTML 邮件模板，通过 Resend 发送格式丰富的通知。
- **元数据增强**：可选集成 TMDB / TheTVDB，获取电影和剧集的封面图片、简介和本地化标题。
- **模板管理界面**：内置 Web 界面，用于预览和测试邮件模板，支持实时变量替换。
- **Next.js App Router**：采用现代 Next.js 架构和 TypeScript，确保类型安全和可维护性。

## 快速开始

1. **安装依赖**
   ```bash
   pnpm install
   ```
2. **配置环境变量**
   - 邮件：`RESEND_API_KEY`, `NOTIFICATION_EMAIL_FROM`, `NOTIFICATION_EMAIL_TO`
   - 安全：`WEBHOOK_TOKEN_SECRET`（可选：`WEBHOOK_TOKEN_HEADER`，默认 `x-vv-token`）
   - 元数据（可选）：`TMDB_API_KEY` / `THE_TVDB_API_KEY` 及语言偏好设置
   - 详见 [`docs/ENVIRONMENT_VARIABLES.md`](./docs/ENVIRONMENT_VARIABLES.md)
3. **本地开发**
   ```bash
   pnpm dev
   ```
4. **配置 Sonarr/Radarr Webhook**
   - Sonarr：`https://<your-deployment>/api/webhooks/sonarr`
   - Radarr：`https://<your-deployment>/api/webhooks/radarr`
   - Method：`POST`
   - HTTP Header：`<WEBHOOK_TOKEN_HEADER>: <WEBHOOK_TOKEN_SECRET>`

## API

### `POST /api/webhooks/sonarr`

| 项目   | 说明                                                      |
| ------ | --------------------------------------------------------- |
| 鉴权   | Header Token                                              |
| 请求体 | 原生 Sonarr Webhook JSON                                  |
| 行为   | 使用模板渲染邮件并通过 Resend 发送                        |
| 返回   | `{ code: 0, message: 'ok', data: { source, eventType } }` |

### `POST /api/webhooks/radarr`

| 项目   | 说明                                                      |
| ------ | --------------------------------------------------------- |
| 鉴权   | Header Token                                              |
| 请求体 | 原生 Radarr Webhook JSON                                  |
| 行为   | 使用模板渲染邮件并通过 Resend 发送                        |
| 返回   | `{ code: 0, message: 'ok', data: { source, eventType } }` |

## 许可证

MIT
