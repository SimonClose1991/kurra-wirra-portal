/**
 * Object ACL policy stored as S3 user metadata (x-amz-meta-acl-policy).
 *
 * S3 has no in-place metadata edit, so setObjectAclPolicy uses a
 * copy-object-onto-itself with REPLACE metadata directive.
 */
import {
  S3Client,
  HeadObjectCommand,
  CopyObjectCommand,
} from "@aws-sdk/client-s3";

// Imported lazily to avoid a circular import at module load.
let _s3: S3Client | null = null;
let _bucket = "";
let _metaKey = "acl-policy";
async function s3() {
  if (!_s3) {
    const mod = await import("./objectStorage");
    _s3 = mod.s3Client;
    _bucket = mod.BUCKET;
    _metaKey = mod.ACL_METADATA_KEY;
  }
  return { client: _s3, bucket: _bucket, metaKey: _metaKey };
}

export enum ObjectAccessGroupType {}

export interface ObjectAccessGroup {
  type: ObjectAccessGroupType;
  id: string;
}

export enum ObjectPermission {
  READ = "read",
  WRITE = "write",
}

export interface ObjectAclRule {
  group: ObjectAccessGroup;
  permission: ObjectPermission;
}

export interface ObjectAclPolicy {
  owner: string;
  visibility: "public" | "private";
  aclRules?: Array<ObjectAclRule>;
}

/** Minimal handle: any object exposing its S3 key. */
export interface AclTarget {
  key: string;
}

function isPermissionAllowed(
  requested: ObjectPermission,
  granted: ObjectPermission,
): boolean {
  if (requested === ObjectPermission.READ) {
    return [ObjectPermission.READ, ObjectPermission.WRITE].includes(granted);
  }
  return granted === ObjectPermission.WRITE;
}

abstract class BaseObjectAccessGroup implements ObjectAccessGroup {
  constructor(
    public readonly type: ObjectAccessGroupType,
    public readonly id: string,
  ) {}
  public abstract hasMember(userId: string): Promise<boolean>;
}

function createObjectAccessGroup(
  group: ObjectAccessGroup,
): BaseObjectAccessGroup {
  switch (group.type) {
    default:
      throw new Error(`Unknown access group type: ${group.type}`);
  }
}

export async function setObjectAclPolicy(
  objectFile: AclTarget,
  aclPolicy: ObjectAclPolicy,
): Promise<void> {
  const { client, bucket, metaKey } = await s3();
  await client.send(
    new CopyObjectCommand({
      Bucket: bucket,
      Key: objectFile.key,
      CopySource: `/${bucket}/${objectFile.key}`,
      MetadataDirective: "REPLACE",
      Metadata: { [metaKey]: JSON.stringify(aclPolicy) },
    }),
  );
}

export async function getObjectAclPolicy(
  objectFile: AclTarget,
): Promise<ObjectAclPolicy | null> {
  const { client, bucket, metaKey } = await s3();
  try {
    const head = await client.send(
      new HeadObjectCommand({ Bucket: bucket, Key: objectFile.key }),
    );
    const raw = head.Metadata?.[metaKey];
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export async function canAccessObject({
  userId,
  objectFile,
  requestedPermission,
}: {
  userId?: string;
  objectFile: AclTarget;
  requestedPermission: ObjectPermission;
}): Promise<boolean> {
  const aclPolicy = await getObjectAclPolicy(objectFile);
  if (!aclPolicy) return false;

  if (
    aclPolicy.visibility === "public" &&
    requestedPermission === ObjectPermission.READ
  ) {
    return true;
  }

  if (!userId) return false;
  if (aclPolicy.owner === userId) return true;

  for (const rule of aclPolicy.aclRules || []) {
    const accessGroup = createObjectAccessGroup(rule.group);
    if (
      (await accessGroup.hasMember(userId)) &&
      isPermissionAllowed(requestedPermission, rule.permission)
    ) {
      return true;
    }
  }

  return false;
}
