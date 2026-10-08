import type { Request } from 'express';
import { validationResult, type ValidationChain } from 'express-validator';
import { describe, expect, it } from 'vitest';
import { userrValidator } from '../../../src/modules/users/user.validator';
import { user } from '../../fixtures/user';

async function validate(chains: ValidationChain[], values: Partial<Request>) {
  const req = values as Request;
  // A fresh request per test avoids reusing express-validator's request context.
  for (const chain of chains) await chain.run(req);
  return validationResult(req).array();
}

describe('createUser validation', () => {
  it('accepts a valid email and full name', async () => {
    expect(await validate(userrValidator.createUser, {
      body: { email: user.email, fullName: user.fullName },
    })).toEqual([]);
  });

  it.each([
    { body: { fullName: 'Budi' }, message: 'Email is required', field: 'email' },
    { body: { email: '', fullName: 'Budi' }, message: 'Email is required', field: 'email' },
    { body: { email: null, fullName: 'Budi' }, message: 'Email is required', field: 'email' },
    { body: { email: 'invalid', fullName: 'Budi' }, message: 'Invalid email format', field: 'email' },
    { body: { email: user.email }, message: 'Full name is required', field: 'fullName' },
    { body: { email: user.email, fullName: '' }, message: 'Full name is required', field: 'fullName' },
    { body: { email: user.email, fullName: null }, message: 'Full name is required', field: 'fullName' },
  ])('rejects $body with $message', async ({ body, message, field }) => {
    expect(await validate(userrValidator.createUser, { body })).toContainEqual(
      expect.objectContaining({ path: field, msg: message, location: 'body' }),
    );
  });

  it('reports both missing required fields', async () => {
    const errors = await validate(userrValidator.createUser, { body: {} });
    expect(errors).toEqual(expect.arrayContaining([
      expect.objectContaining({ path: 'email', msg: 'Email is required' }),
      expect.objectContaining({ path: 'fullName', msg: 'Full name is required' }),
    ]));
  });
});

describe('user ID validation', () => {
  it('accepts a valid UUID', async () => {
    expect(await validate(userrValidator.validUserID, { params: { id: user.id } })).toEqual([]);
  });

  it.each(['', '123', 'not-a-uuid', '550e8400-e29b-41d4-a716-44665544000Z'])('rejects invalid ID %j', async (id) => {
    expect(await validate(userrValidator.validUserID, { params: { id } })).toEqual([
      expect.objectContaining({ path: 'id', msg: 'Invalid user ID format.', location: 'params' }),
    ]);
  });
});
