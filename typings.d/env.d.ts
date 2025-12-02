declare namespace NodeJS {
  interface ProcessEnv {
    /**
     * Build time (displayed in footer).
     * NOTE: usually injected by the build system (e.g. Webpack/Vite),
     * so you normally do NOT need to define it in .env files.
     */
    NEXT_PUBLIC_BUILD_TIME?: string

    /** Admin username (for login) */
    ACCESS_USERNAME: string
    /** Admin password (for login) */
    ACCESS_PASSWORD: string
    /** Optional: TOTP secret for 2FA. When set, 2FA is enabled. */
    ACCESS_2FA_SECRET?: string

    /** JWT secret */
    JWT_SECRET: string
    /** JWT expiration time (seconds or like "1d", default "1d") */
    JWT_EXPIRES_IN?: string

    /** API authentication configuration */
    /** API header name for token (used by third-party callers, default "x-vv-token") */
    API_TOKEN_HEADER?: string
    /** API secret token value (must match the token sent by third-party callers) */
    API_SECRET?: string
    /** API username for Basic Authentication */
    API_USERNAME?: string
    /** API password for Basic Authentication */
    API_PASSWORD?: string

    /** TMDB related configuration */
    TMDB_API_KEY?: string
    /** Preferred TMDB language (default "zh-CN" if not set) */
    TMDB_LANGUAGE?: string
    TMDB_REGION?: string
    /** TMDB session ID for user authentication (long-term valid) */
    TMDB_SESSION_ID?: string

    /** TheTVDB related configuration */
    THE_TVDB_API_KEY?: string
    /** Preferred TheTVDB language (default "zh-CN" if not set) */
    THE_TVDB_LANGUAGE?: string

    /** Preferred metadata language (e.g. "zh-CN") for title/metadata selection (default "zh-CN") */
    PREFERRED_METADATA_LANGUAGE?: string

    /** Resend email notification configuration */
    RESEND_API_KEY?: string
    NOTIFICATION_EMAIL_TO?: string
    NOTIFICATION_EMAIL_FROM?: string

    /** Gist storage configuration (used when Gist features are enabled) */
    GIST_ID?: string
    GIST_TOKEN?: string

    /** Vercel API access token (used to list vercel-* projects) */
    VERCEL_ACCESS_TOKEN?: string
    /** Comma-separated list of Vercel projects to exclude from display */
    VERCEL_PROJECT_EXCLUDES?: string

    /** Navidrome music server configuration */
    /** Navidrome server URL (e.g. "https://music.example.com") */
    NAVIDROME_URL?: string
    /** Navidrome username for API authentication */
    NAVIDROME_USERNAME?: string
    /** Navidrome password for API authentication */
    NAVIDROME_PASSWORD?: string

    /** Cache configuration */
    /** Enable/disable cache (default: "1" for enabled, "0" for disabled) */
    CACHE?: string

    /** Cron job secret for authorization (Bearer token in Authorization header) */
    /** Used for cron job authentication, separate from API_SECRET */
    CRON_SECRET?: string

    /** Douban RSS URL for syncing movie list to TMDB favorites */
    DOUBAN_RSS_URL?: string
  }
}
