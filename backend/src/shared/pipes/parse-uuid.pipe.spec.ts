import { ApplicationError } from '../errors/application-error.js';
import { ParseUuidPipe } from './parse-uuid.pipe.js';

describe('ParseUuidPipe', () => {
  const pipe = new ParseUuidPipe();
  const meetingId = '550e8400-e29b-41d4-a716-446655440000';

  it('returns a valid uuid unchanged', () => {
    expect(pipe.transform(meetingId)).toBe(meetingId);
  });

  it('rejects a value that is not a uuid', () => {
    expect(() => pipe.transform('meeting-1')).toThrow(ApplicationError);
    try {
      pipe.transform('meeting-1');
    } catch (error) {
      expect(error).toBeInstanceOf(ApplicationError);
      expect((error as ApplicationError).code).toBe('invalid_request');
      expect((error as ApplicationError).statusCode).toBe(400);
    }
  });
});
