import { localSeed } from '../database/local-seed.js';
import { ApplicationError } from '../shared/errors/application-error.js';
import { MeetingsService } from './meetings.service.js';
import type { MeetingExistence } from './meetings.repository.js';

describe('MeetingsService', () => {
  it('accepts a meeting that has a row', async () => {
    const exists = vi.fn<MeetingExistence['exists']>().mockResolvedValue(true);
    const service = new MeetingsService({ exists });

    await expect(
      service.assertMeetingExists(localSeed.meetingId),
    ).resolves.toBeUndefined();
    expect(exists).toHaveBeenCalledWith(localSeed.meetingId);
  });

  it('rejects a meeting that has no row', async () => {
    const exists = vi.fn<MeetingExistence['exists']>().mockResolvedValue(false);
    const service = new MeetingsService({ exists });

    await expect(
      service.assertMeetingExists(localSeed.meetingId),
    ).rejects.toBeInstanceOf(ApplicationError);
    await expect(
      service.assertMeetingExists(localSeed.meetingId),
    ).rejects.toMatchObject({ code: 'not_found', statusCode: 404 });
  });

  it('rejects an id that is not a uuid before querying', async () => {
    const exists = vi.fn<MeetingExistence['exists']>();
    const service = new MeetingsService({ exists });

    await expect(
      service.assertMeetingExists('meeting-1'),
    ).rejects.toMatchObject({ code: 'invalid_request', statusCode: 400 });
    expect(exists).not.toHaveBeenCalled();
  });
});
