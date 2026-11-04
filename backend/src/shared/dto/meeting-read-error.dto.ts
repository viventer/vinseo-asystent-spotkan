import { createZodDto } from 'nestjs-zod';
import { meetingReadErrorSchema } from '../errors/application-error.js';

export class MeetingReadErrorDto extends createZodDto(meetingReadErrorSchema) {}
