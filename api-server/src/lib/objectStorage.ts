/**
 * S3-compatible object storage (Cloudflare R2 / AWS S3 / Backblaze B2 / MinIO).
 *
 * Replaces the Replit GCS sidecar. Works with any S3-compatible provider.
 *
 * Required env vars:
 *   S3_ENDPOINT        e.g. https://<accountid>.r2.cloudflarestorage.com  (omit for real AWS S3)
 *   S3_REGION          e.g. auto (R2) or us-east-1 (AWS)
 *   S3_ACCESS_KEY_ID
 *   S3_SECRET_ACCESS_KEY
 *   S3_BUCKET          the bucket all objects live in
 *   PRIVATE_OBJECT_DIR   path prefix for private uploads, e.g. "uploads"
 *   PUBLIC_OBJECT_SEARCH_PATHS  comma-separated public prefixes, e.g. "public"
 */
import { Readable } from "stream";
import { randomUUID } from "crypto";
import {
  S3Client,
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import {
  ObjectAclPolicy,
  ObjectPermission,
  canAccessObject,
  getObjectAclPolicy,
  setObjectAclPolicy,
} from "./objectAcl";

const ACL_METADATA_KEY = "acl-policy"; // stored as S3 user metadata x-amz-meta-acl-policy

function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`${name} environment variable is required`);
  return v;
}

export const BUCKET = process.env.S3_BUCKET || "";

export const s3Client = new S3Client({
  region: process.env.S3_REGION || "auto",
  endpoint: process.env.S3_ENDPOINT || undefined, // undefined => real AWS S3
  forcePathStyle: !!process.env.S3_ENDPOINT, // path-style for R2/MinIO; virtual-host for AWS
  credentials: {
    accessKeyId: requireEnv("S3_ACCESS_KEY_ID"),
    secretAccessKey: requireEnv("S3_SECRET_ACCESS_KEY"),
  },
});

export class ObjectNotFoundError extends Error {
  constructor() {
    super("Object not found");
    this.name = "ObjectNotFoundError";
    Object.setPrototypeOf(this, ObjectNotFoundError.prototype);
  }
}

/** A lightweight handle to an S3 object (replaces the GCS File type). */
export interface StoredObject {
  key: string;
}

export class ObjectStorageService {
  constructor() {}

  getPublicObjectSearchPaths(): Array<string> {
    const pathsStr = process.env.PUBLIC_OBJECT_SEARCH_PATHS || "";
    const paths = Array.from(
      new Set(
        pathsStr
          .split(",")
          .map((p) => p.trim().replace(/^\/+|\/+$/g, ""))
          .filter((p) => p.length > 0),
      ),
    );
    if (paths.length === 0) {
      throw new Error(
        "PUBLIC_OBJECT_SEARCH_PATHS not set (comma-separated key prefixes).",
      );
    }
    return paths;
  }

  getPrivateObjectDir(): string {
    const dir = (process.env.PRIVATE_OBJECT_DIR || "").replace(/^\/+|\/+$/g, "");
    if (!dir) throw new Error("PRIVATE_OBJECT_DIR not set.");
    return dir;
  }

  /** Find a public object by searching each configured prefix. */
  async searchPublicObject(filePath: string): Promise<StoredObject | null> {
    const clean = filePath.replace(/^\/+/, "");
    for (const prefix of this.getPublicObjectSearchPaths()) {
      const key = `${prefix}/${clean}`;
      if (await this.objectExists(key)) return { key };
    }
    return null;
  }

  private async objectExists(key: string): Promise<boolean> {
    try {
      await s3Client.send(new HeadObjectCommand({ Bucket: BUCKET, Key: key }));
      return true;
    } catch {
      return false;
    }
  }

  /** Stream an object back to the caller as a web Response. */
  async downloadObject(
    obj: StoredObject,
    cacheTtlSec: number = 3600,
  ): Promise<Response> {
    const out = await s3Client.send(
      new GetObjectCommand({ Bucket: BUCKET, Key: obj.key }),
    );

    const aclPolicy = await getObjectAclPolicy({ key: obj.key });
    const isPublic = aclPolicy?.visibility === "public";

    const nodeStream = out.Body as Readable;
    const webStream = Readable.toWeb(nodeStream) as ReadableStream;

    const headers: Record<string, string> = {
      "Content-Type": out.ContentType || "application/octet-stream",
      "Cache-Control": `${isPublic ? "public" : "private"}, max-age=${cacheTtlSec}`,
    };
    if (out.ContentLength != null) {
      headers["Content-Length"] = String(out.ContentLength);
    }

    return new Response(webStream, { headers });
  }

  /** Presigned PUT URL the browser uploads to directly. */
  async getObjectEntityUploadURL(): Promise<string> {
    const dir = this.getPrivateObjectDir();
    const objectId = randomUUID();
    const key = `${dir}/uploads/${objectId}`;

    return getSignedUrl(
      s3Client,
      new PutObjectCommand({ Bucket: BUCKET, Key: key }),
      { expiresIn: 900 },
    );
  }

  /** Resolve an /objects/<id> path to a stored object handle, 404 if missing. */
  async getObjectEntityFile(objectPath: string): Promise<StoredObject> {
    if (!objectPath.startsWith("/objects/")) throw new ObjectNotFoundError();

    const parts = objectPath.slice(1).split("/");
    if (parts.length < 2) throw new ObjectNotFoundError();

    const entityId = parts.slice(1).join("/");
    const key = `${this.getPrivateObjectDir()}/${entityId}`;

    if (!(await this.objectExists(key))) throw new ObjectNotFoundError();
    return { key };
  }

  /** Turn a presigned/absolute upload URL into the canonical /objects/<id> path. */
  normalizeObjectEntityPath(rawPath: string): string {
    let key: string;
    try {
      const url = new URL(rawPath);
      // strip leading "/" and, for path-style endpoints, the bucket segment
      key = decodeURIComponent(url.pathname.replace(/^\/+/, ""));
      if (process.env.S3_ENDPOINT && key.startsWith(`${BUCKET}/`)) {
        key = key.slice(BUCKET.length + 1);
      }
    } catch {
      return rawPath; // not a URL; return as-is
    }

    let dir = this.getPrivateObjectDir();
    if (!dir.endsWith("/")) dir = `${dir}/`;

    if (!key.startsWith(dir)) return `/${key}`;
    const entityId = key.slice(dir.length);
    return `/objects/${entityId}`;
  }

  async trySetObjectEntityAclPolicy(
    rawPath: string,
    aclPolicy: ObjectAclPolicy,
  ): Promise<string> {
    const normalizedPath = this.normalizeObjectEntityPath(rawPath);
    if (!normalizedPath.startsWith("/objects/")) return normalizedPath;

    const obj = await this.getObjectEntityFile(normalizedPath);
    await setObjectAclPolicy(obj, aclPolicy);
    return normalizedPath;
  }

  async canAccessObjectEntity({
    userId,
    objectFile,
    requestedPermission,
  }: {
    userId?: string;
    objectFile: StoredObject;
    requestedPermission?: ObjectPermission;
  }): Promise<boolean> {
    return canAccessObject({
      userId,
      objectFile,
      requestedPermission: requestedPermission ?? ObjectPermission.READ,
    });
  }
}

// Exported for objectAcl.ts to read/write metadata via copy-in-place.
export { ACL_METADATA_KEY };
