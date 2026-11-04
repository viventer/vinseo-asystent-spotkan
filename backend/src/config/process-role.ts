export type ProcessRole = 'api' | 'worker';

let processRole: ProcessRole = 'api';

export function useWorkerProcess(): void {
  processRole = 'worker';
}

export function useApiProcess(): void {
  processRole = 'api';
}

export function currentProcessRole(): ProcessRole {
  return processRole;
}
