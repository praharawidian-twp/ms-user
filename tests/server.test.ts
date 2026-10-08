import { afterEach, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ listen: vi.fn() }));
vi.mock('../src/app', () => ({ app: { listen: mocks.listen } }));

afterEach(() => vi.unstubAllEnvs());

it.each([
  { configured: undefined, expected: 3001 },
  { configured: '', expected: 3001 },
  { configured: '4000', expected: '4000' },
])('starts on $expected when PORT is $configured', async ({ configured, expected }) => {
  vi.resetModules();
  vi.stubEnv('PORT', configured);
  vi.spyOn(console, 'log').mockImplementation(() => {});
  mocks.listen.mockImplementation((_port: string | number, onListening: () => void) => onListening());
  await import('../src/server.js');
  expect(mocks.listen).toHaveBeenCalledWith(expected, expect.any(Function));
  expect(console.log).toHaveBeenCalledWith(`User Service is running on port ${expected}`);
});
