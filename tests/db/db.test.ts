import { afterEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ pool: { on: vi.fn() }, poolConstructor: vi.fn(), drizzle: vi.fn() }));
vi.mock('dotenv/config', () => ({}));
vi.mock('pg', () => ({
  Pool: class {
    constructor(options: unknown) {
      mocks.poolConstructor(options);
      return mocks.pool;
    }
  },
}));
vi.mock('drizzle-orm/node-postgres', () => ({ drizzle: mocks.drizzle }));

afterEach(() => vi.unstubAllEnvs());

describe('database initialization', () => {
  it.each([
    { environment: 'development', ssl: false },
    { environment: 'test', ssl: false },
    { environment: 'production', ssl: { rejectUnauthorized: false } },
  ])('configures the pool in $environment', async ({ environment, ssl }) => {
    vi.resetModules();
    vi.stubEnv('NODE_ENV', environment);
    vi.stubEnv('DATABASE_URL_DEV', 'postgresql://test:test@localhost/test');
    const client = { query: vi.fn().mockResolvedValue(undefined) };
    const drizzleDb = { query: {} };
    mocks.drizzle.mockReturnValue(drizzleDb);

    const { db, pool } = await import('../../src/db/db.js');
    const schema = await import('../../src/db/schemas/index.js');

    expect(mocks.poolConstructor).toHaveBeenCalledWith({
      connectionString: 'postgresql://test:test@localhost/test', ssl,
      max: 10, idleTimeoutMillis: 30_000, connectionTimeoutMillis: 10_000,
    });
    expect(pool).toBe(mocks.pool);
    expect(db).toBe(drizzleDb);
    expect(mocks.drizzle).toHaveBeenCalledWith(mocks.pool, { schema });
    expect(mocks.pool.on).toHaveBeenCalledWith('connect', expect.any(Function));
    const onConnect = mocks.pool.on.mock.calls[0][1] as (connection: typeof client) => Promise<void>;
    await onConnect(client);
    expect(client.query).toHaveBeenCalledWith("SET TIME ZONE 'UTC'");
  });
});
