import { Pool } from 'pg';

let pool: Pool | undefined;

// A single pool is reused across the whole build. Without it, ~50 pages would open ~50
// TCP connections and Postgres would start refusing them; `max: 4` is ample for a
// single-threaded static build.
export function getPool(): Pool {
  if (!pool) {
    const connectionString = process.env.DATABASE_URI;
    if (!connectionString) {
      throw new Error('DATABASE_URI is not set — the build must reach the content database');
    }
    pool = new Pool({ connectionString, max: 4, idleTimeoutMillis: 5_000 });
  }
  return pool;
}

export async function query<T>(sql: string, params: unknown[] = []): Promise<T[]> {
  const result = await getPool().query(sql, params as never[]);
  return result.rows as T[];
}

export async function closePool(): Promise<void> {
  if (pool) await pool.end();
  pool = undefined;
}
