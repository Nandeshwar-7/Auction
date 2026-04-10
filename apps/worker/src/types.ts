export interface Env {
  AUCTION_ROOM: DurableObjectNamespace;
  DB: Hyperdrive;
  /** Defaults to `auction_session` when unset (e.g. local dev without .dev.vars). */
  SESSION_COOKIE_NAME?: string;
  /** Comma-separated list. Defaults to localhost dev origins when unset. */
  ALLOWED_ORIGINS?: string;
}
