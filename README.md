[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT) [![中文](https://img.shields.io/badge/docs-%E4%B8%AD%E6%96%87-green?style=flat-square&logo=docs)](./README.zh-CN.md)

# vercel-veil

`vercel-veil` is a lightweight gateway service running on Vercel. It receives webhooks from \*arr series applications (Sonarr/Radarr), processes them, and sends beautifully formatted email notifications via Resend using customizable HTML templates.

## Features

- **Flexible API Authentication**: All external endpoints support Cookie, Header Token, or Basic Auth (username/password)
- **Sonarr/Radarr/Prowlarr Webhook Support**: Dedicated endpoints accept native webhook JSON with flexible authentication
- **Template-based Email Notifications**: Uses customizable HTML email templates to send rich, formatted notifications via Resend.
- **Metadata Enrichment**: Optional integration with TMDB / TheTVDB to fetch cover images, synopsis, and localized titles for movies and TV series.
- **Template Management UI**: Built-in web interface for previewing and testing email templates with live variable substitution.
- **Next.js App Router**: Modern Next.js architecture with TypeScript for type safety and maintainability.

## Quick Start

1. **Install dependencies**
   ```bash
   pnpm install
   ```
2. **Configure environment variables**
   - Email: `RESEND_API_KEY`, `NOTIFICATION_EMAIL_FROM`, `NOTIFICATION_EMAIL_TO`
   - Security: `API_USERNAME`, `API_PASSWORD` (required), `API_TOKEN_SECRET` (optional), `API_TOKEN_HEADER` (optional, defaults to `x-vv-token`)
   - Metadata (optional): `TMDB_API_KEY` / `THE_TVDB_API_KEY` and language preferences
   - See [`docs/ENVIRONMENT_VARIABLES.md`](./docs/ENVIRONMENT_VARIABLES.md) for all variables
3. **Run locally**
   ```bash
   pnpm dev
   ```
4. **Configure webhooks**
   - Sonarr/Radarr: `https://<your-deployment>/api/webhooks/sonarr` or `/api/webhooks/radarr`
     - Method: `POST`
     - Basic Auth: Username/Password (required)
     - HTTP Header: `<API_TOKEN_HEADER>: <API_TOKEN_SECRET>` (required if `API_TOKEN_SECRET` is configured)
   - Prowlarr: `https://<your-deployment>/api/webhooks/prowlarr`
     - Method: `POST`
     - Basic Auth: Username/Password (required)

## API

### `POST /api/webhooks/sonarr`

| Item     | Description                                                   |
| -------- | ------------------------------------------------------------- |
| Auth     | Basic Auth (username/password) + Header Token (if configured) |
| Body     | Native Sonarr webhook JSON                                    |
| Action   | Renders email using template and sends via Resend             |
| Response | `{ code: 0, message: 'ok', data: { source, eventType } }`     |

### `POST /api/webhooks/radarr`

| Item     | Description                                                   |
| -------- | ------------------------------------------------------------- |
| Auth     | Basic Auth (username/password) + Header Token (if configured) |
| Body     | Native Radarr webhook JSON                                    |
| Action   | Renders email using template and sends via Resend             |
| Response | `{ code: 0, message: 'ok', data: { source, eventType } }`     |

### `POST /api/webhooks/prowlarr`

| Item     | Description                                               |
| -------- | --------------------------------------------------------- |
| Auth     | Basic Auth (username/password) only                       |
| Body     | Native Prowlarr webhook JSON                              |
| Action   | Renders email using template and sends via Resend         |
| Response | `{ code: 0, message: 'ok', data: { source, eventType } }` |

## License

MIT
