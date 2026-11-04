import { Controller, HttpCode, Param, Post } from '@nestjs/common';
import {
  ApiAcceptedResponse,
  ApiBadRequestResponse,
  ApiInternalServerErrorResponse,
  ApiNotFoundResponse,
  ApiOperation,
} from '@nestjs/swagger';
import { MeetingReadErrorDto } from '../shared/dto/meeting-read-error.dto.js';
import { ParseUuidPipe } from '../shared/pipes/parse-uuid.pipe.js';
import { ProcessingService } from './processing.service.js';

@Controller('meetings')
export class ProcessingController {
  constructor(private readonly processing: ProcessingService) {}

  @Post(':meetingId/processing')
  @HttpCode(202)
  @ApiOperation({ summary: 'Start processing for one prepared meeting.' })
  @ApiAcceptedResponse({ description: 'Processing was accepted.' })
  @ApiBadRequestResponse({
    description: 'The meeting id is not a uuid.',
    type: MeetingReadErrorDto.Output,
  })
  @ApiNotFoundResponse({
    description: 'The meeting has no row.',
    type: MeetingReadErrorDto.Output,
  })
  @ApiInternalServerErrorResponse({
    description: 'Processing could not be started.',
    type: MeetingReadErrorDto.Output,
  })
  start(@Param('meetingId', ParseUuidPipe) meetingId: string): Promise<void> {
    return this.processing.start(meetingId);
  }
}
