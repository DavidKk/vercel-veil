[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT) [![中文](https://img.shields.io/badge/docs-%E4%B8%AD%E6%96%87-green?style=flat-square&logo=docs)](./README.zh-CN.md)

# vercel-veil

`vercel-veil` is a lightweight gateway service running on Vercel. It receives webhooks from \*arr series applications (Sonarr/Radarr), processes them, and sends beautifully formatted email notifications via Resend using customizable HTML templates.

## Features

- **Token-protected APIs**: All external endpoints require a custom header token for secure access.
- **Sonarr/Radarr Webhook Support**: Dedicated endpoints (`POST /api/webhooks/sonarr` and `POST /api/webhooks/radarr`) accept native webhook JSON from Sonarr and Radarr.
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
   - Security: `WEBHOOK_TOKEN_SECRET` (optional: `WEBHOOK_TOKEN_HEADER`, defaults to `x-vv-token`)
   - Metadata (optional): `TMDB_API_KEY` / `THE_TVDB_API_KEY` and language preferences
   - See [`docs/ENVIRONMENT_VARIABLES.md`](./docs/ENVIRONMENT_VARIABLES.md) for all variables
3. **Run locally**
   ```bash
   pnpm dev
   ```
4. **Configure Sonarr/Radarr webhooks**
   - Sonarr: `https://<your-deployment>/api/webhooks/sonarr`
   - Radarr: `https://<your-deployment>/api/webhooks/radarr`
   - Method: `POST`
   - HTTP Header: `<WEBHOOK_TOKEN_HEADER>: <WEBHOOK_TOKEN_SECRET>`

## API

### `POST /api/webhooks/sonarr`

| Item     | Description                                               |
| -------- | --------------------------------------------------------- |
| Auth     | Custom header token (`WEBHOOK_TOKEN_HEADER`)              |
| Body     | Native Sonarr webhook JSON                                |
| Action   | Renders email using template and sends via Resend         |
| Response | `{ code: 0, message: 'ok', data: { source, eventType } }` |

### `POST /api/webhooks/radarr`

| Item     | Description                                               |
| -------- | --------------------------------------------------------- |
| Auth     | Custom header token (`WEBHOOK_TOKEN_HEADER`)              |
| Body     | Native Radarr webhook JSON                                |
| Action   | Renders email using template and sends via Resend         |
| Response | `{ code: 0, message: 'ok', data: { source, eventType } }` |

## License

MIT
