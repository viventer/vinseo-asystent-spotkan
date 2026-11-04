import {
  createParamDecorator,
  Injectable,
  type ExecutionContext,
  type PipeTransform,
} from '@nestjs/common';
import type { IncomingHttpHeaders } from 'node:http';
import { z } from 'zod';
import { ApplicationError } from '../errors/application-error.js';

const callerUserIdSchema = z.uuid();

interface HeaderRequest {
  headers: IncomingHttpHeaders;
}

const extractCallerUserId = createParamDecorator(
  (_data: undefined, context: ExecutionContext): unknown => {
    const request = context.switchToHttp().getRequest<HeaderRequest>();
    return request.headers['x-user-id'];
  },
);

@Injectable()
export class CallerUserIdPipe implements PipeTransform<unknown, string> {
  transform(value: unknown): string {
    return parseCallerUserId(value);
  }
}

export function parseCallerUserId(header: unknown): string {
  if (typeof header !== 'string') {
    throw new ApplicationError('unauthenticated');
  }

  const parsed = callerUserIdSchema.safeParse(header);
  if (!parsed.success) {
    throw new ApplicationError('unauthenticated');
  }

  return parsed.data;
}

// Nest records parameter metadata from right to left and reports the first
// failure. Keep @Param(..., ParseUuidPipe) to the right of @CallerUserId()
// so a malformed path id stays invalid_request when the header is also bad.
export const CallerUserId = (): ParameterDecorator =>
  extractCallerUserId(CallerUserIdPipe);
