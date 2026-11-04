import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { speakerSchema } from '../../shared/dto/speaker.dto.js';

export const taskResponseSchema = z.object({
  speaker: speakerSchema,
  action: z.string().min(1),
  deadline: z.iso.date(),
});

export const tasksResponseSchema = z.object({
  tasks: z.array(taskResponseSchema),
});

export type TasksResponse = z.infer<typeof tasksResponseSchema>;

export class TasksResponseDto extends createZodDto(tasksResponseSchema) {}
