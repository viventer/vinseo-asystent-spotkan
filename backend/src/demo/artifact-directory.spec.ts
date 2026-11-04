import {
  directoryOwner,
  prepareArtifactDirectory,
} from './artifact-directory.js';

describe('directoryOwner', () => {
  it('drops privileges only when the process is root and both ids are set', () => {
    expect(directoryOwner(0, 1000, 1000)).toEqual({ uid: 1000, gid: 1000 });
    expect(directoryOwner(1000, 1000, 1000)).toBeUndefined();
    expect(directoryOwner(0, 1000, undefined)).toBeUndefined();
    expect(directoryOwner(undefined, 1000, 1000)).toBeUndefined();
  });
});

describe('prepareArtifactDirectory', () => {
  it('creates the directory without changing ownership', async () => {
    const mkdir = vi.fn(async () => undefined);
    const chown = vi.fn(async () => undefined);
    const drop = vi.fn();

    await prepareArtifactDirectory(
      '/artifacts',
      '/artifacts/example-meeting',
      undefined,
      {
        mkdir,
        chown,
        drop,
      },
    );

    expect(mkdir).toHaveBeenCalledWith('/artifacts/example-meeting');
    expect(chown).not.toHaveBeenCalled();
    expect(drop).not.toHaveBeenCalled();
  });

  it('gives the directory to the host user before dropping privileges', async () => {
    const events: string[] = [];
    await prepareArtifactDirectory(
      '/artifacts',
      '/artifacts/example-meeting',
      { uid: 1000, gid: 1000 },
      {
        mkdir: async (path) => {
          events.push(`mkdir ${path}`);
        },
        chown: async (path, uid, gid) => {
          events.push(`chown ${path} ${uid}:${gid}`);
        },
        drop: (uid, gid) => {
          events.push(`drop ${uid}:${gid}`);
        },
      },
    );

    expect(events).toEqual([
      'mkdir /artifacts/example-meeting',
      'chown /artifacts 1000:1000',
      'chown /artifacts/example-meeting 1000:1000',
      'drop 1000:1000',
    ]);
  });
});
