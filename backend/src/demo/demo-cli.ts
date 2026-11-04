import { chown, mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { localSeed } from '../database/local-seed.js';
import {
  directoryOwner,
  prepareArtifactDirectory,
} from './artifact-directory.js';
import { collectExampleMeeting, demoPollIntervalMs } from './demo-client.js';
import { loadDemoEnv } from './demo-env.js';
import {
  renderDecisions,
  renderSummary,
  renderTasks,
  renderTranscript,
} from './markdown-export.js';

try {
  const env = loadDemoEnv(process.env);
  const results = await collectExampleMeeting({
    baseUrl: env.API_BASE_URL,
    meetingId: localSeed.meetingId,
    callerUserId: localSeed.employees[0].id,
    timeoutMs: env.DEMO_TIMEOUT_MS,
    pollIntervalMs: demoPollIntervalMs,
    fetchImpl: fetch,
    sleep: (ms) =>
      new Promise((resolve) => {
        setTimeout(resolve, ms);
      }),
    now: () => Date.now(),
  });

  const directory = join(env.ARTIFACTS_DIR, 'example-meeting');
  await prepareArtifactDirectory(
    env.ARTIFACTS_DIR,
    directory,
    directoryOwner(
      typeof process.getuid === 'function' ? process.getuid() : undefined,
      env.DEMO_UID,
      env.DEMO_GID,
    ),
    {
      mkdir: async (path) => {
        await mkdir(path, { recursive: true });
      },
      chown,
      drop: (uid, gid) => {
        if (process.setgid === undefined || process.setuid === undefined) {
          throw new Error('This process cannot change its user');
        }
        process.setgid(gid);
        process.setuid(uid);
      },
    },
  );
  await Promise.all([
    writeFile(
      join(directory, 'transcript.md'),
      renderTranscript(results.transcript),
    ),
    writeFile(join(directory, 'summary.md'), renderSummary(results.summary)),
    writeFile(
      join(directory, 'decisions.md'),
      renderDecisions(results.summary),
    ),
    writeFile(join(directory, 'tasks.md'), renderTasks(results.tasks)),
  ]);
  console.log(`Wrote example meeting results to ${directory}`);
} catch (error) {
  const message =
    error instanceof Error ? error.message : 'Example meeting export failed';
  console.error(message);
  process.exitCode = 1;
}
