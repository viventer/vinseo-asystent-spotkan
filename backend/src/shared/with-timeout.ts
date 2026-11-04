export class StepTimeoutError extends Error {
  constructor(timeoutMs: number) {
    super(`Processing step timed out after ${timeoutMs}ms`);
    this.name = 'StepTimeoutError';
  }
}

export function withTimeout<T>(
  work: Promise<T>,
  timeoutMs: number,
): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_resolve, reject) => {
    timer = setTimeout(() => {
      reject(new StepTimeoutError(timeoutMs));
    }, timeoutMs);
  });

  return Promise.race([work, timeout]).finally(() => {
    if (timer !== undefined) {
      clearTimeout(timer);
    }
  });
}
