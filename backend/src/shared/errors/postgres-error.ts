const postgresErrorCodePattern = /^[0-9A-Z]{5}$/;

export const UNIQUE_VIOLATION = '23505';
export const FOREIGN_KEY_VIOLATION = '23503';

export function postgresErrorCode(error: unknown): string | undefined {
  const seen = new Set<unknown>();
  let current: unknown = error;
  while (isRecord(current) && !seen.has(current)) {
    seen.add(current);
    if (
      typeof current.code === 'string' &&
      postgresErrorCodePattern.test(current.code)
    ) {
      return current.code;
    }
    current = current.cause;
  }
  return undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}
