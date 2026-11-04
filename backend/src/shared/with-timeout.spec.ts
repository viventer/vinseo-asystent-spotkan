import { StepTimeoutError, withTimeout } from './with-timeout.js';

describe('withTimeout', () => {
  it('returns the result when the work finishes first', async () => {
    await expect(withTimeout(Promise.resolve('done'), 50)).resolves.toBe(
      'done',
    );
  });

  it('rejects when the work outlasts the limit and leaves that work running', async () => {
    let finished = false;
    const work = new Promise<string>((resolve) => {
      setTimeout(() => {
        finished = true;
        resolve('late');
      }, 40);
    });

    await expect(withTimeout(work, 10)).rejects.toBeInstanceOf(StepTimeoutError);
    expect(finished).toBe(false);

    await work;
    expect(finished).toBe(true);
  });

  it('rejects with the work error when that error happens first', async () => {
    await expect(
      withTimeout(Promise.reject(new Error('step failed')), 50),
    ).rejects.toThrow('step failed');
  });
});
