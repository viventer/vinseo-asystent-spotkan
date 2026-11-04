import { HealthService } from './health.service.js';

describe('HealthService', () => {
  it('reports that the process is answering', () => {
    expect(new HealthService().getHealth()).toEqual({ status: 'ok' });
  });
});
