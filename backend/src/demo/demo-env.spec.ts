import { loadDemoEnv } from './demo-env.js';

describe('loadDemoEnv', () => {
  it('reads the API address and artifact directory and defaults the timeout', () => {
    expect(
      loadDemoEnv({
        API_BASE_URL: 'http://api:3000',
        ARTIFACTS_DIR: '/artifacts',
      }),
    ).toEqual({
      API_BASE_URL: 'http://api:3000',
      ARTIFACTS_DIR: '/artifacts',
      DEMO_TIMEOUT_MS: 60_000,
    });
  });

  it('reads the host user ids used after claiming the artifact directory', () => {
    expect(
      loadDemoEnv({
        API_BASE_URL: 'http://api:3000',
        ARTIFACTS_DIR: '/artifacts',
        DEMO_UID: '1000',
        DEMO_GID: '1000',
      }),
    ).toMatchObject({ DEMO_UID: 1000, DEMO_GID: 1000 });
  });

  it('names a missing variable and does not repeat other values', () => {
    expect(() =>
      loadDemoEnv({
        ARTIFACTS_DIR: '/artifacts',
        DEMO_TIMEOUT_MS: '15000',
      }),
    ).toThrowError(/^Invalid environment configuration: API_BASE_URL$/);
  });

  it('names an invalid timeout and does not repeat the value', () => {
    expect(() =>
      loadDemoEnv({
        API_BASE_URL: 'http://api:3000',
        ARTIFACTS_DIR: '/artifacts',
        DEMO_TIMEOUT_MS: '0',
      }),
    ).toThrowError(/^Invalid environment configuration: DEMO_TIMEOUT_MS$/);
  });
});
