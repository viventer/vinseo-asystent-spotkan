import { ArgumentsHost, Catch, ExceptionFilter } from '@nestjs/common';
import type { NodeResponse } from '@nestjs/platform-node';
import {
  ApplicationError,
  type MeetingReadError,
} from '../errors/application-error.js';

@Catch()
export class ApplicationExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<NodeResponse>();
    const mapped = this.toResponse(exception);
    response.status(mapped.statusCode).json(mapped.body);
  }

  private toResponse(exception: unknown): {
    statusCode: number;
    body: MeetingReadError;
  } {
    if (exception instanceof ApplicationError) {
      return {
        statusCode: exception.statusCode,
        body: { error: exception.code },
      };
    }

    return {
      statusCode: 500,
      body: { error: 'internal_error' },
    };
  }
}
