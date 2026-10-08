import request from 'supertest';
import { expect, it, vi } from 'vitest';
import { user } from '../fixtures/user';

const services = vi.hoisted(() => ({ createUser: vi.fn(), getAllUsers: vi.fn(), getUserById: vi.fn() }));
vi.mock('../../src/modules/users/user.service', () => services);

import { app } from '../../src/app';

it('serves the root endpoint with CORS enabled', async () => {
  const response = await request(app).get('/').expect(200);
  expect(response.text).toBe('User Service is running');
  expect(response.headers['access-control-allow-origin']).toBe('*');
});

it('parses JSON and routes POST requests through validation to the controller', async () => {
  const body = { email: user.email, fullName: user.fullName };
  services.createUser.mockResolvedValue(user);
  const response = await request(app).post('/api/users').send(body).expect(201);
  expect(services.createUser).toHaveBeenCalledWith(body);
  expect(response.body).toEqual({ ...user, createdAt: user.createdAt.toISOString(), updatedAt: user.updatedAt.toISOString() });
});

it('rejects invalid POST bodies before calling the service', async () => {
  const response = await request(app).post('/api/users').send({ email: 'invalid' }).expect(400);
  expect(response.body.errors).toEqual(expect.arrayContaining([
    expect.objectContaining({ path: 'email', msg: 'Invalid email format' }),
    expect.objectContaining({ path: 'fullName', msg: 'Full name is required' }),
  ]));
  expect(services.createUser).not.toHaveBeenCalled();
});

it('rejects malformed JSON before calling the service', async () => {
  await request(app).post('/api/users').set('Content-Type', 'application/json').send('{').expect(400);
  expect(services.createUser).not.toHaveBeenCalled();
});

it('routes GET collection requests to the list handler', async () => {
  services.getAllUsers.mockResolvedValue([]);
  const response = await request(app).get('/api/users').expect(200);
  expect(response.body).toEqual([]);
  expect(services.getAllUsers).toHaveBeenCalledOnce();
});

it('routes valid UUID requests to the lookup handler', async () => {
  services.getUserById.mockResolvedValue(user);
  const response = await request(app).get(`/api/users/${user.id}`).expect(200);
  expect(response.body.id).toBe(user.id);
  expect(services.getUserById).toHaveBeenCalledWith(user.id);
});

it('rejects invalid UUIDs before calling the service', async () => {
  const response = await request(app).get('/api/users/invalid').expect(400);
  expect(response.body.errors).toEqual([
    expect.objectContaining({ path: 'id', msg: 'Invalid user ID format.' }),
  ]);
  expect(services.getUserById).not.toHaveBeenCalled();
});

it('returns 404 for missing users', async () => {
  services.getUserById.mockResolvedValue(null);
  const response = await request(app).get(`/api/users/${user.id}`).expect(404);
  expect(response.body).toEqual({ error: 'User not found' });
});

it('returns 404 for unregistered routes', async () => {
  await request(app).get('/unknown').expect(404);
  expect(services.getAllUsers).not.toHaveBeenCalled();
});

it('answers CORS preflight requests', async () => {
  const response = await request(app).options('/api/users')
    .set('Origin', 'https://example.com').set('Access-Control-Request-Method', 'POST').expect(204);
  expect(response.headers['access-control-allow-origin']).toBe('*');
  expect(response.headers['access-control-allow-methods']).toContain('POST');
  expect(services.createUser).not.toHaveBeenCalled();
});
