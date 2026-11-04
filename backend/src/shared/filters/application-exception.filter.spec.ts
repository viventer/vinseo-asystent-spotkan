import { ArgumentsHost } from '@nestjs/common';
import { ApplicationError } from '../errors/application-error.js';
import { ApplicationExceptionFilter } from './application-exception.filter.js';

function createHost() {
  const json = vi.fn();
  const status = vi.fn(() => ({ json }));
  const host = {
    switchToHttp: () => ({
      getResponse: () => ({ status }),
    }),
  } as ArgumentsHost;

  return { host, status, json };
}

describe('ApplicationExceptionFilter', () => {
  const filter = new ApplicationExceptionFilter();

  it('maps an application error to its status and error code', () => {
    const { host, status, json } = createHost();

    filter.catch(new ApplicationError('invalid_request'), host);

    expect(status).toHaveBeenCalledWith(400);
    expect(json).toHaveBeenCalledWith({ error: 'invalid_request' });
  });

  it('hides an unexpected failure behind internal_error', () => {
    const { host, status, json } = createHost();

    filter.catch(
      new Error('postgresql://postgres:secret@localhost/vinseo'),
      host,
    );

    expect(status).toHaveBeenCalledWith(500);
    expect(json).toHaveBeenCalledWith({ error: 'internal_error' });
  });
});
