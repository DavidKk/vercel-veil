# Environment Variables

`vercel-veil` 需要若干环境变量来驱动 Webhook 鉴权、邮件通知以及调试辅助。下表按功能分类列出。

## API 鉴权

| 变量               | 必填 | 描述                                                                    | 示例                 |
| ------------------ | ---- | ----------------------------------------------------------------------- | -------------------- |
| `API_USERNAME`     | 是   | API 用户名，用于 Basic Authentication                                   | `api_user`           |
| `API_PASSWORD`     | 是   | API 密码，用于 Basic Authentication                                     | `secure_password`    |
| `API_TOKEN_SECRET` | 否   | API Token 值，用于 Header Token 认证（可选，但 Sonarr/Radarr 推荐使用） | `super-secret-token` |
| `API_TOKEN_HEADER` | 否   | API Token 所在的 Header 名称，默认 `x-vv-token`                         | `x-custom-token`     |

**认证方式说明**：

- **API 接口**（如 `/api/music/*`, `/api/feed/*`）：支持 Cookie、Header Token 或 Basic Auth
- **Sonarr/Radarr Webhook**：需要 Basic Auth（用户名密码），如果配置了 `API_TOKEN_SECRET` 则同时需要 Header Token
- **Prowlarr Webhook**：只需要 Basic Auth（用户名密码），不支持 Header Token

## 邮件通知（Resend）

| 变量                      | 必填 | 描述                                     | 示例                                 |
| ------------------------- | ---- | ---------------------------------------- | ------------------------------------ |
| `RESEND_API_KEY`          | 是   | Resend 平台 API Key                      | `re_xxxxxxxxxxxxx`                   |
| `NOTIFICATION_EMAIL_FROM` | 是   | 邮件发送者地址（需与 Resend 认证域匹配） | `Veil <noreply@example.com>`         |
| `NOTIFICATION_EMAIL_TO`   | 是   | 默认接收者地址，支持逗号分隔多个地址     | `ops@example.com,alerts@example.com` |

## 元数据解析（TMDB / TheTVDB）

| 变量                          | 必填 | 描述                                         | 示例         |
| ----------------------------- | ---- | -------------------------------------------- | ------------ |
| `TMDB_API_KEY`                | 否   | TMDB API Key，用于根据标题/ID 查询多语言信息 | `tmdb_xxxxx` |
| `TMDB_LANGUAGE`               | 否   | TMDB 查询语言，默认 `zh-CN`                  | `zh-TW`      |
| `TMDB_REGION`                 | 否   | TMDB 查询区域，会影响结果排序                | `CN`         |
| `THE_TVDB_API_KEY`            | 否   | TheTVDB API Key，用于补充剧集信息            | `tvdb_xxxxx` |
| `THE_TVDB_LANGUAGE`           | 否   | TheTVDB 查询语言，默认 `zh-CN`               | `zh-CN`      |
| `PREFERRED_METADATA_LANGUAGE` | 否   | 当两个平台都可用时的首选语言                 | `zh-CN`      |

## 可选：Vercel 项目信息

| 变量                      | 必填 | 描述                                         | 示例                        |
| ------------------------- | ---- | -------------------------------------------- | --------------------------- |
| `VERCEL_ACCESS_TOKEN`     | 否   | 用于页脚展示其它 Vercel 项目信息的 API Token | `vercel_xxxxxxxxx`          |
| `VERCEL_PROJECT_EXCLUDES` | 否   | 需要从展示列表中排除的项目名，逗号分隔       | `vercel-demo,vercel-legacy` |

## Build 元信息

| 变量                     | 必填 | 描述                         | 示例                   |
| ------------------------ | ---- | ---------------------------- | ---------------------- |
| `NEXT_PUBLIC_BUILD_TIME` | 否   | 构建时间戳，构建流程自动注入 | `2024-01-01T00:00:00Z` |
