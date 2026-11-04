import { Inject, Injectable } from '@nestjs/common';
import type { DatabaseExecutor } from '../database/database.js';
import { ApplicationError } from '../shared/errors/application-error.js';
import {
  meetingReadRequestSchema,
  type MeetingReadRequest,
} from './meeting-read-request.js';
import {
  MeetingsRepository,
  type ParticipantLookup,
  type ParticipantRole,
} from './meetings.repository.js';

export type { ParticipantRole };

@Injectable()
export class MeetingAccessService {
  constructor(
    @Inject(MeetingsRepository)
    private readonly meetingsRepository: ParticipantLookup,
  ) {}

  async getParticipantRole(
    request: MeetingReadRequest,
    executor?: DatabaseExecutor,
  ): Promise<ParticipantRole> {
    const parsed = meetingReadRequestSchema.safeParse(request);
    if (!parsed.success) {
      throw new ApplicationError('invalid_request');
    }

    const role = await this.meetingsRepository.findParticipantRole(
      parsed.data.meetingId,
      parsed.data.callerUserId,
      executor,
    );
    if (role === null) {
      throw new ApplicationError('not_found');
    }

    return role;
  }
}
