import { postgresErrorCode } from './postgres-error.js';

describe('postgresErrorCode', () => {
  it('reads a postgres code from the error', () => {
    expect(postgresErrorCode({ code: '23505' })).toBe('23505');
  });

  it('reads a postgres code nested in cause', () => {
    expect(
      postgresErrorCode({
        message: 'query failed',
        cause: { code: '23503' },
      }),
    ).toBe('23503');
  });

  it('skips a code that is not a postgres sqlstate', () => {
    expect(
      postgresErrorCode({
        code: 'ECONNRESET',
        cause: { code: '23505' },
      }),
    ).toBe('23505');
  });

  it('returns undefined when no postgres code is present', () => {
    expect(postgresErrorCode(new Error('connection reset'))).toBeUndefined();
    expect(postgresErrorCode('23505')).toBeUndefined();
    expect(postgresErrorCode(null)).toBeUndefined();
  });

  it('stops when the cause chain cycles', () => {
    const error: Record<string, unknown> = { code: 'not-a-code' };
    error.cause = error;

    expect(postgresErrorCode(error)).toBeUndefined();
  });
});
