import { loadEnv } from './env.schema.js';

const validSource = {
  PORT: '3000',
  DATABASE_URL: 'postgresql://postgres:postgres@localhost:5432/vinseo',
  REDIS_URL: 'redis://localhost:6379',
};

describe('loadEnv', () => {
  it('returns the typed configuration when every required variable is set', () => {
    expect(loadEnv(validSource)).toEqual({
      PORT: 3000,
      DATABASE_URL: validSource.DATABASE_URL,
      REDIS_URL: validSource.REDIS_URL,
    });
  });

  it('names a missing variable and does not repeat other values', () => {
    expect(() =>
      loadEnv({
        PORT: '3000',
        REDIS_URL: validSource.REDIS_URL,
      }),
    ).toThrowError(/^Invalid environment configuration: DATABASE_URL$/);
  });

  it('names an invalid port and does not repeat connection strings', () => {
    expect(() =>
      loadEnv({
        ...validSource,
        PORT: '0',
      }),
    ).toThrowError(/^Invalid environment configuration: PORT$/);
  });
});
