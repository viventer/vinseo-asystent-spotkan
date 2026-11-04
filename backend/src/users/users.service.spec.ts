import type { DatabaseExecutor } from '../database/database.js';
import { ApplicationError } from '../shared/errors/application-error.js';
import type { UserLookup, UserRecord } from './users.repository.js';
import { UsersService } from './users.service.js';

const user: UserRecord = {
  id: '22222222-2222-4222-8222-222222222222',
  displayName: 'Example Employee One',
  email: 'employee.one@example.com',
};

describe('UsersService', () => {
  it('returns the user looked up by id', async () => {
    const findById = vi.fn<UserLookup['findById']>().mockResolvedValue(user);
    const service = new UsersService({ findById });

    await expect(service.findById(user.id)).resolves.toEqual(user);
    expect(findById).toHaveBeenCalledWith(user.id, undefined);
  });

  it('returns null when no user has that id', async () => {
    const findById = vi.fn<UserLookup['findById']>().mockResolvedValue(null);
    const service = new UsersService({ findById });

    await expect(service.findById(user.id)).resolves.toBeNull();
  });

  it('rejects an id that is not a uuid before querying', async () => {
    const findById = vi.fn<UserLookup['findById']>();
    const service = new UsersService({ findById });

    await expect(service.findById('employee-one')).rejects.toBeInstanceOf(
      ApplicationError,
    );
    await expect(service.findById('employee-one')).rejects.toMatchObject({
      code: 'invalid_request',
      statusCode: 400,
    });
    expect(findById).not.toHaveBeenCalled();
  });

  it('forwards a transaction to the repository', async () => {
    const findById = vi.fn<UserLookup['findById']>().mockResolvedValue(user);
    const service = new UsersService({ findById });
    const executor = {} as DatabaseExecutor;

    await service.findById(user.id, executor);

    expect(findById).toHaveBeenCalledWith(user.id, executor);
  });
});
