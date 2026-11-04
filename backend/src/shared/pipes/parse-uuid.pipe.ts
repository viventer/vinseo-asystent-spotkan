import { Injectable, PipeTransform } from '@nestjs/common';
import { z } from 'zod';
import { ApplicationError } from '../errors/application-error.js';

const uuidSchema = z.uuid();

@Injectable()
export class ParseUuidPipe implements PipeTransform<unknown, string> {
  transform(value: unknown): string {
    const parsed = uuidSchema.safeParse(value);
    if (!parsed.success) {
      throw new ApplicationError('invalid_request');
    }

    return parsed.data;
  }
}
