import { resolve } from 'node:path';
import type { Application } from 'express';
import type { Pool } from 'pg';
import { PostgreSqlContainer, type StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { afterAll, beforeAll, beforeEach, vi } from 'vitest';

let container: StartedPostgreSqlContainer | undefined;
let pool: Pool | undefined;
let app: Application | undefined;

export function getTestContext(): { app: Application; pool: Pool } {
  if (!app || !pool) throw new Error('Integration database has not been initialized');
  return { app, pool };
}

beforeAll(async () => {
  container = await new PostgreSqlContainer(process.env.TEST_POSTGRES_IMAGE || 'postgres:16-alpine')
    .withDatabase('user_service_integration')
    .withUsername('integration')
    .withPassword('integration')
    .start();

  // The pool is initialized on import, so set its URL before loading the app.
  // Explicit values also prevent dotenv from supplying a development database URL.
  vi.stubEnv('DATABASE_URL_DEV', container.getConnectionUri());
  vi.stubEnv('NODE_ENV', 'test');
  const database = await import('../../src/db/db.js');
  pool = database.pool;
  await migrate(database.db, { migrationsFolder: resolve('src/db/migrations') });
  app = (await import('../../src/app.js')).app;
});

beforeEach(async () => {
  // This pool always points to the newly created container, never the local .env database.
  await getTestContext().pool.query('TRUNCATE TABLE "users"');
});

afterAll(async () => {
  // Cleanup also runs if migrations or app initialization fail.
  try {
    await pool?.end();
  } finally {
    try {
      await container?.stop();
    } finally {
      app = undefined;
      pool = undefined;
      container = undefined;
      vi.unstubAllEnvs();
    }
  }
});
