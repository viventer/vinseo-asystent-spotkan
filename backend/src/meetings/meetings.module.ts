import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module.js';
import { MeetingAccessService } from './meeting-access.service.js';
import { MeetingsRepository } from './meetings.repository.js';

@Module({
  imports: [DatabaseModule],
  providers: [MeetingsRepository, MeetingAccessService],
  exports: [MeetingAccessService],
})
export class MeetingsModule {}
