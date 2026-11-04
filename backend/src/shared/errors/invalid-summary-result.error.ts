import { ApplicationError } from './application-error.js';

export class InvalidSummaryResultError extends ApplicationError {
  constructor() {
    super('internal_error');
    this.name = 'InvalidSummaryResultError';
  }
}
