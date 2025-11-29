[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT) [![English](https://img.shields.io/badge/docs-English-green?style=flat-square&logo=docs)](./README.md)

# vercel-veil

`vercel-veil` 是一个运行在 Vercel 上的轻量级网关服务。它接收来自 \*arr 系列应用（Sonarr/Radarr）的 Webhook，处理并发送通过 Resend 的格式化邮件通知，支持自定义 HTML 模板。

## 功能特性

- **灵活的 API 认证**：所有外部接口支持 Cookie、Header Token 或 Basic Auth（用户名密码）
- **Sonarr/Radarr/Prowlarr Webhook 支持**：专用端点接收原生 Webhook JSON，支持灵活的认证方式
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
   - 安全：`API_USERNAME`, `API_PASSWORD`（必需），`API_TOKEN_SECRET`（可选），`API_TOKEN_HEADER`（可选，默认 `x-vv-token`）
   - 元数据（可选）：`TMDB_API_KEY` / `THE_TVDB_API_KEY` 及语言偏好设置
   - 详见 [`docs/ENVIRONMENT_VARIABLES.md`](./docs/ENVIRONMENT_VARIABLES.md)
3. **本地开发**
   ```bash
   pnpm dev
   ```
4. **配置 Webhook**
   - Sonarr/Radarr：`https://<your-deployment>/api/webhooks/sonarr` 或 `/api/webhooks/radarr`
     - Method：`POST`
     - Basic Auth：用户名/密码（必需）
     - HTTP Header：`<API_TOKEN_HEADER>: <API_TOKEN_SECRET>`（如果配置了 `API_TOKEN_SECRET` 则必需）
   - Prowlarr：`https://<your-deployment>/api/webhooks/prowlarr`
     - Method：`POST`
     - Basic Auth：用户名/密码（必需）

## API

### `POST /api/webhooks/sonarr`

| 项目   | 说明                                                      |
| ------ | --------------------------------------------------------- |
| 鉴权   | Basic Auth（用户名密码）+ Header Token（如果已配置）      |
| 请求体 | 原生 Sonarr Webhook JSON                                  |
| 行为   | 使用模板渲染邮件并通过 Resend 发送                        |
| 返回   | `{ code: 0, message: 'ok', data: { source, eventType } }` |

### `POST /api/webhooks/radarr`

| 项目   | 说明                                                      |
| ------ | --------------------------------------------------------- |
| 鉴权   | Basic Auth（用户名密码）+ Header Token（如果已配置）      |
| 请求体 | 原生 Radarr Webhook JSON                                  |
| 行为   | 使用模板渲染邮件并通过 Resend 发送                        |
| 返回   | `{ code: 0, message: 'ok', data: { source, eventType } }` |

### `POST /api/webhooks/prowlarr`

| 项目   | 说明                                                      |
| ------ | --------------------------------------------------------- |
| 鉴权   | Basic Auth（用户名密码）                                  |
| 请求体 | 原生 Prowlarr Webhook JSON                                |
| 行为   | 使用模板渲染邮件并通过 Resend 发送                        |
| 返回   | `{ code: 0, message: 'ok', data: { source, eventType } }` |

## 许可证

MIT
