import { beforeEach, describe, expect, it, vi } from 'vitest';
import { eq } from 'drizzle-orm';
import { usersTable } from '../../../src/db/schemas/users';
import { user } from '../../fixtures/user';

const mocks = vi.hoisted(() => ({
  insert: vi.fn(), values: vi.fn(), returning: vi.fn(),
  select: vi.fn(), from: vi.fn(), findFirst: vi.fn(),
}));

vi.mock('../../../src/db/db', () => ({
  db: {
    insert: mocks.insert, select: mocks.select,
    query: { usersTable: { findFirst: mocks.findFirst } },
  },
}));

import { createUser, getAllUsers, getUserById } from '../../../src/modules/users/user.service';

beforeEach(() => {
  vi.spyOn(console, 'error').mockImplementation(() => {});
  mocks.insert.mockReturnValue({ values: mocks.values });
  mocks.values.mockReturnValue({ returning: mocks.returning });
  mocks.select.mockReturnValue({ from: mocks.from });
});

describe('createUser', () => {
  it('inserts the supplied user and returns the saved record', async () => {
    mocks.returning.mockResolvedValue([user]);
    await expect(createUser(user)).resolves.toEqual(user);
    expect(mocks.insert).toHaveBeenCalledWith(usersTable);
    expect(mocks.values).toHaveBeenCalledWith(user);
    expect(mocks.returning).toHaveBeenCalledOnce();
  });

  it('logs database failures and throws a service error', async () => {
    const error = new Error('duplicate email');
    mocks.returning.mockRejectedValue(error);
    await expect(createUser(user)).rejects.toThrow('Failed to create user.');
    expect(console.error).toHaveBeenCalledWith('Error creating user:', error);
  });
});

describe('getAllUsers', () => {
  it.each([{ records: [user] }, { records: [] }])('returns the database result %#', async ({ records }) => {
    mocks.from.mockResolvedValue(records);
    await expect(getAllUsers()).resolves.toEqual(records);
    expect(mocks.select).toHaveBeenCalledWith();
    expect(mocks.from).toHaveBeenCalledWith(usersTable);
  });

  it('logs database failures and throws a service error', async () => {
    const error = new Error('connection lost');
    mocks.from.mockRejectedValue(error);
    await expect(getAllUsers()).rejects.toThrow('Failed to retrieve users.');
    expect(console.error).toHaveBeenCalledWith('Error getting all users:', error);
  });
});

describe('getUserById', () => {
  it('queries the requested ID and returns the matching user', async () => {
    mocks.findFirst.mockResolvedValue(user);
    await expect(getUserById(user.id)).resolves.toEqual(user);
    expect(mocks.findFirst).toHaveBeenCalledWith({ where: eq(usersTable.id, user.id) });
  });

  it('returns null when no record exists', async () => {
    mocks.findFirst.mockResolvedValue(undefined);
    await expect(getUserById(user.id)).resolves.toBeNull();
  });

  it('logs database failures and includes the ID in the service error', async () => {
    const error = new Error('connection lost');
    mocks.findFirst.mockRejectedValue(error);
    await expect(getUserById(user.id)).rejects.toThrow(`Failed to retrieve user with ID ${user.id}.`);
    expect(console.error).toHaveBeenCalledWith(`Error getting user by ID ${user.id}:`, error);
  });
});
