export interface DirectoryOwner {
  uid: number;
  gid: number;
}

export function directoryOwner(
  currentUid: number | undefined,
  requestedUid: number | undefined,
  requestedGid: number | undefined,
): DirectoryOwner | undefined {
  if (
    currentUid !== 0 ||
    requestedUid === undefined ||
    requestedGid === undefined
  ) {
    return undefined;
  }
  return { uid: requestedUid, gid: requestedGid };
}

export async function prepareArtifactDirectory(
  artifactsDir: string,
  directory: string,
  owner: DirectoryOwner | undefined,
  io: {
    mkdir: (path: string) => Promise<void>;
    chown: (path: string, uid: number, gid: number) => Promise<void>;
    drop: (uid: number, gid: number) => void;
  },
): Promise<void> {
  await io.mkdir(directory);
  if (owner === undefined) {
    return;
  }
  await io.chown(artifactsDir, owner.uid, owner.gid);
  await io.chown(directory, owner.uid, owner.gid);
  io.drop(owner.uid, owner.gid);
}
