// db.ts
import 'dotenv/config';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schemas';

const connectionString = process.env.DATABASE_URL_DEV!;

const isProd = process.env.NODE_ENV === 'production';

// Create a pool
export const pool = new Pool({
    connectionString,
    ssl: isProd ? { rejectUnauthorized: false } : false,
    max: 10,                   // pool size
    idleTimeoutMillis: 30_000, // close idle clients after 30s
    connectionTimeoutMillis: 10_000, // fail if can’t connect in 10s
});

// Set the session time zone for each new connection
pool.on('connect', async (client) => {
    // Choose the TZ you want the session to use:
    await client.query(`SET TIME ZONE 'UTC'`);
});

// Pass the pool to Drizzle
export const db = drizzle(pool, { schema }); 
