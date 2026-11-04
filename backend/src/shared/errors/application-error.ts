import { z } from 'zod';

export const applicationErrorCodeSchema = z.enum([
  'not_found',
  'unauthenticated',
  'invalid_request',
  'internal_error',
]);

export type ApplicationErrorCode = z.infer<typeof applicationErrorCodeSchema>;

export const meetingReadErrorSchema = z.object({
  error: applicationErrorCodeSchema,
});

export type MeetingReadError = z.infer<typeof meetingReadErrorSchema>;

const statusByCode: Record<ApplicationErrorCode, number> = {
  not_found: 404,
  unauthenticated: 401,
  invalid_request: 400,
  internal_error: 500,
};

export class ApplicationError extends Error {
  readonly code: ApplicationErrorCode;
  readonly statusCode: number;

  constructor(code: ApplicationErrorCode) {
    super(code);
    this.name = 'ApplicationError';
    this.code = code;
    this.statusCode = statusByCode[code];
  }
}
