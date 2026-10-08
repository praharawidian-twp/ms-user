import type { Request, Response } from 'express';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { user } from '../../fixtures/user';

const mocks = vi.hoisted(() => ({
  createUser: vi.fn(), getAllUsers: vi.fn(), getUserById: vi.fn(), validationResult: vi.fn(),
}));
vi.mock('../../../src/modules/users/user.service', () => mocks);
vi.mock('express-validator', () => ({ validationResult: mocks.validationResult }));

import { createUserHandler, getAllUserHandler, getUserByIdHandler } from '../../../src/modules/users/user.controller';

function response() {
  const res = { status: vi.fn(), json: vi.fn() };
  res.status.mockReturnValue(res);
  return res;
}

beforeEach(() => {
  mocks.validationResult.mockReturnValue({ isEmpty: () => true });
});

describe('createUserHandler', () => {
  it('returns the saved user with status 201', async () => {
    const body = { email: user.email, fullName: user.fullName };
    mocks.createUser.mockResolvedValue(user);
    const res = response();
    await createUserHandler({ body } as Request, res as unknown as Response);
    expect(mocks.createUser).toHaveBeenCalledWith(body);
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith(user);
  });

  it('returns 500 when creation fails', async () => {
    mocks.createUser.mockRejectedValue(new Error('database failure'));
    const res = response();
    await createUserHandler({ body: {} } as Request, res as unknown as Response);
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: 'Failed to create user' });
  });
});

describe('getAllUserHandler', () => {
  it.each([{ records: [user] }, { records: [] }])('returns $records with status 200', async ({ records }) => {
    mocks.getAllUsers.mockResolvedValue(records);
    const res = response();
    await getAllUserHandler({} as Request, res as unknown as Response);
    expect(mocks.getAllUsers).toHaveBeenCalledWith();
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(records);
  });

  it('returns 500 when listing fails', async () => {
    mocks.getAllUsers.mockRejectedValue(new Error('database failure'));
    const res = response();
    await getAllUserHandler({} as Request, res as unknown as Response);
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: 'Failed to fetch users' });
  });
});

describe('getUserByIdHandler', () => {
  it.each([{ id: user.id }, { id: [user.id, 'unused'] }])('handles string and array route parameters: %j', async ({ id }) => {
    mocks.getUserById.mockResolvedValue(user);
    const res = response();
    await getUserByIdHandler({ params: { id } } as unknown as Request, res as unknown as Response);
    expect(mocks.getUserById).toHaveBeenCalledWith(user.id);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(user);
  });

  it('returns 404 when no user exists', async () => {
    mocks.getUserById.mockResolvedValue(null);
    const res = response();
    await getUserByIdHandler({ params: { id: user.id } } as unknown as Request, res as unknown as Response);
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ error: 'User not found' });
  });

  it('returns 500 when lookup fails', async () => {
    vi.spyOn(console, 'log').mockImplementation(() => {});
    mocks.getUserById.mockRejectedValue(new Error('database failure'));
    const res = response();
    await getUserByIdHandler({ params: { id: user.id } } as unknown as Request, res as unknown as Response);
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: 'Failed to fetch user' });
  });
});

describe('validation failures', () => {
  it.each([
    { handler: createUserHandler, service: mocks.createUser },
    { handler: getUserByIdHandler, service: mocks.getUserById },
  ])('returns 400 and skips the service %#', async ({ handler, service }) => {
    const errors = [{ type: 'field', path: 'email', msg: 'Invalid email format', location: 'body' }];
    const req = {} as Request;
    mocks.validationResult.mockReturnValue({ isEmpty: () => false, array: () => errors });
    const res = response();
    await handler(req, res as unknown as Response);
    expect(mocks.validationResult).toHaveBeenCalledWith(req);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ errors });
    expect(service).not.toHaveBeenCalled();
  });
});
