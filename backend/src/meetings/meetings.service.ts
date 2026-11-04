import { Inject, Injectable } from '@nestjs/common';
import { z } from 'zod';
import { ApplicationError } from '../shared/errors/application-error.js';
import {
  MeetingsRepository,
  type MeetingExistence,
} from './meetings.repository.js';

const meetingIdSchema = z.uuid();

@Injectable()
export class MeetingsService {
  constructor(
    @Inject(MeetingsRepository)
    private readonly meetings: MeetingExistence,
  ) {}

  async assertMeetingExists(meetingId: string): Promise<void> {
    const parsed = meetingIdSchema.safeParse(meetingId);
    if (!parsed.success) {
      throw new ApplicationError('invalid_request');
    }

    const exists = await this.meetings.exists(parsed.data);
    if (!exists) {
      throw new ApplicationError('not_found');
    }
  }
}
