import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module.js';
import { MeetingAccessService } from './meeting-access.service.js';
import { MeetingsRepository } from './meetings.repository.js';
import { MeetingsService } from './meetings.service.js';

@Module({
  imports: [DatabaseModule],
  providers: [MeetingsRepository, MeetingAccessService, MeetingsService],
  exports: [MeetingAccessService, MeetingsService],
})
export class MeetingsModule {}
