import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';
import { getTestContext } from './setup';

const input = { email: 'budi@example.com', fullName: 'Budi' };
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

describe('users API with PostgreSQL', () => {
  it('applies the committed migrations and uses UTC database sessions', async () => {
    const { pool } = getTestContext();
    const migrations = await pool.query('SELECT * FROM drizzle.__drizzle_migrations');
    expect(migrations.rows.length).toBeGreaterThan(0);
    const timezone = await pool.query('SHOW TIME ZONE');
    expect(timezone.rows[0].TimeZone).toBe('UTC');
  });

  it('creates a persisted user with database-generated ID and timestamps', async () => {
    const { app, pool } = getTestContext();
    const response = await request(app).post('/api/users').send(input).expect(201);

    expect(response.body).toEqual({
      ...input,
      id: expect.stringMatching(uuidPattern),
      createdAt: expect.any(String),
      updatedAt: expect.any(String),
    });
    expect(Number.isNaN(Date.parse(response.body.createdAt))).toBe(false);
    expect(response.body.updatedAt).toBe(response.body.createdAt);

    // The schema uses timestamp without time zone. Interpret the stored UTC values
    // explicitly so pg's local-time parser cannot shift this verification query.
    const stored = await pool.query(`
      SELECT id, email, full_name,
        created_at AT TIME ZONE 'UTC' AS created_at,
        updated_at AT TIME ZONE 'UTC' AS updated_at
      FROM users WHERE id = $1
    `, [response.body.id]);
    expect(stored.rows).toHaveLength(1);
    expect(stored.rows[0]).toMatchObject({ id: response.body.id, email: input.email, full_name: input.fullName });
    expect(stored.rows[0].created_at.toISOString()).toBe(response.body.createdAt);
    expect(stored.rows[0].updated_at.toISOString()).toBe(response.body.updatedAt);
  });

  it('returns an empty list from a clean database', async () => {
    const response = await request(getTestContext().app).get('/api/users').expect(200);
    expect(response.body).toEqual([]);
  });

  it('lists all persisted users', async () => {
    const { app } = getTestContext();
    const first = await request(app).post('/api/users').send(input).expect(201);
    const second = await request(app).post('/api/users')
      .send({ email: 'siti@example.com', fullName: 'Siti' }).expect(201);

    const response = await request(app).get('/api/users').expect(200);
    expect(response.body).toHaveLength(2);
    expect(response.body).toEqual(expect.arrayContaining([first.body, second.body]));
  });

  it('retrieves exactly the requested user from PostgreSQL', async () => {
    const { app } = getTestContext();
    const created = await request(app).post('/api/users').send(input).expect(201);
    await request(app).post('/api/users').send({ email: 'other@example.com', fullName: 'Other' }).expect(201);

    const response = await request(app).get(`/api/users/${created.body.id}`).expect(200);
    expect(response.body).toEqual(created.body);
  });

  it('returns 404 for a valid UUID without a matching record', async () => {
    const response = await request(getTestContext().app)
      .get('/api/users/550e8400-e29b-41d4-a716-446655440000').expect(404);
    expect(response.body).toEqual({ error: 'User not found' });
  });

  it.each([
    { body: { email: 'invalid', fullName: 'Budi' }, field: 'email', message: 'Invalid email format' },
    { body: { fullName: 'Budi' }, field: 'email', message: 'Email is required' },
    { body: { email: input.email }, field: 'fullName', message: 'Full name is required' },
  ])('rejects $body without inserting a user', async ({ body, field, message }) => {
    const { app, pool } = getTestContext();
    const response = await request(app).post('/api/users').send(body).expect(400);
    expect(response.body.errors).toContainEqual(expect.objectContaining({ path: field, msg: message }));
    expect((await pool.query('SELECT * FROM users')).rows).toEqual([]);
  });

  it('rejects malformed JSON without inserting a user', async () => {
    const { app, pool } = getTestContext();
    await request(app).post('/api/users').set('Content-Type', 'application/json').send('{').expect(400);
    expect((await pool.query('SELECT * FROM users')).rows).toEqual([]);
  });

  it('returns 400 for an invalid UUID', async () => {
    const response = await request(getTestContext().app).get('/api/users/not-a-uuid').expect(400);
    expect(response.body.errors).toEqual([
      expect.objectContaining({ path: 'id', msg: 'Invalid user ID format.' }),
    ]);
  });

  it('enforces unique email addresses and retains the original record', async () => {
    const { app, pool } = getTestContext();
    const original = await request(app).post('/api/users').send(input).expect(201);
    // Suppress the expected database error log, without mocking database behavior.
    const errorLog = vi.spyOn(console, 'error').mockImplementation(() => {});
    const duplicate = await request(app).post('/api/users')
      .send({ ...input, fullName: 'Duplicate' }).expect(500);

    expect(duplicate.body).toEqual({ error: 'Failed to create user' });
    expect(errorLog).toHaveBeenCalledWith('Error creating user:', expect.anything());
    const stored = await pool.query('SELECT id, email, full_name FROM users');
    expect(stored.rows).toEqual([{ id: original.body.id, email: input.email, full_name: input.fullName }]);

    // A failed insert must not prevent subsequent reads.
    const response = await request(app).get(`/api/users/${original.body.id}`).expect(200);
    expect(response.body).toEqual(original.body);
  });
});
