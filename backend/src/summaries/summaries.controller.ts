import { Controller, Get, Param } from '@nestjs/common';
import { ZodSerializerDto } from 'nestjs-zod';
import type { MeetingReadRequest } from '../meetings/meeting-read-request.js';
import { CallerUserId } from '../shared/decorators/caller-user-id.decorator.js';
import { ParseUuidPipe } from '../shared/pipes/parse-uuid.pipe.js';
import { SummaryResponseDto } from './dto/summary-response.dto.js';
import { TasksResponseDto } from './dto/tasks-response.dto.js';
import { SummariesService } from './summaries.service.js';

@Controller('meetings')
export class SummariesController {
  constructor(private readonly summaries: SummariesService) {}

  @Get(':meetingId/summary')
  @ZodSerializerDto(SummaryResponseDto)
  readSummary(
    @CallerUserId() callerUserId: string,
    @Param('meetingId', ParseUuidPipe) meetingId: string,
  ): Promise<SummaryResponseDto> {
    const request: MeetingReadRequest = { meetingId, callerUserId };
    return this.summaries.getSummary(request);
  }

  @Get(':meetingId/tasks')
  @ZodSerializerDto(TasksResponseDto)
  readTasks(
    @CallerUserId() callerUserId: string,
    @Param('meetingId', ParseUuidPipe) meetingId: string,
  ): Promise<TasksResponseDto> {
    const request: MeetingReadRequest = { meetingId, callerUserId };
    return this.summaries.getTasks(request);
  }
}
