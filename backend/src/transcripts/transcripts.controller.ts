import { Controller, Get, Param } from '@nestjs/common';
import { ZodSerializerDto } from 'nestjs-zod';
import type { MeetingReadRequest } from '../meetings/meeting-read-request.js';
import { CallerUserId } from '../shared/decorators/caller-user-id.decorator.js';
import { ParseUuidPipe } from '../shared/pipes/parse-uuid.pipe.js';
import { TranscriptResponseDto } from './dto/transcript-response.dto.js';
import { TranscriptsService } from './transcripts.service.js';

@Controller('meetings')
export class TranscriptsController {
  constructor(private readonly transcripts: TranscriptsService) {}

  @Get(':meetingId/transcript')
  @ZodSerializerDto(TranscriptResponseDto)
  read(
    @CallerUserId() callerUserId: string,
    @Param('meetingId', ParseUuidPipe) meetingId: string,
  ): Promise<TranscriptResponseDto> {
    const request: MeetingReadRequest = { meetingId, callerUserId };
    return this.transcripts.getTranscript(request);
  }
}
