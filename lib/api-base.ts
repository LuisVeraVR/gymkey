/**
 * Single source of truth for the Nest API base URL (includes `/api` prefix).
 * Set `NEXT_PUBLIC_API_URL` in `.env` (see `.env.example`).
 */
const DEFAULT_API_BASE = 'http://localhost:3001/api';

export function getApiBaseUrl(): string {
  const raw = process.env.NEXT_PUBLIC_API_URL?.trim();
  if (!raw) return DEFAULT_API_BASE;
  return raw.replace(/\/$/, '');
}

/** Origin for Socket.IO (same host as API, no `/api` suffix). */
export function getSocketOrigin(): string {
  return getApiBaseUrl().replace(/\/api\/?$/, '');
}
