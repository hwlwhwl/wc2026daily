import { createClient } from '@libsql/client';

let _client: ReturnType<typeof createClient> | null = null;

export function getTurso() {
  if (_client) return _client;
  _client = createClient({
    url: process.env.TURSO_DATABASE_URL ?? 'file:local-daily.db',
    authToken: process.env.TURSO_AUTH_TOKEN ?? undefined,
  });
  return _client;
}
