import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  NotFound,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { env } from '~~/env';
import type {
  UploadContentType,
  UploadTicket,
} from '~~/shared/contracts/media';

const UPLOAD_TICKET_TTL_SECONDS = 60;

let client: S3Client | undefined;

function objectStorageClient() {
  client ??= new S3Client({
    region: env.AWS_REGION,
    // The default ('WHEN_SUPPORTED') signs a CRC32 of the empty presign-time
    // body into the URL, so S3 rejects the real upload with 403.
    requestChecksumCalculation: 'WHEN_REQUIRED',
    credentials: {
      accessKeyId: env.AWS_ACCESS_KEY,
      secretAccessKey: env.AWS_SECRET_ACCESS_KEY,
    },
  });
  return client;
}

/**
 * Presigns a PUT for a server-chosen key. Content type and length are part of
 * the signature, so the client cannot upload a different type or a larger file.
 */
export async function createUploadTicket(input: {
  key: string;
  contentType: UploadContentType;
  contentLength: number;
}): Promise<UploadTicket> {
  const command = new PutObjectCommand({
    Bucket: env.AWS_BUCKET_NAME,
    Key: input.key,
    ContentType: input.contentType,
    ContentLength: input.contentLength,
  });
  const uploadUrl = await getSignedUrl(objectStorageClient(), command, {
    expiresIn: UPLOAD_TICKET_TTL_SECONDS,
    signableHeaders: new Set(['content-type', 'content-length']),
  });
  return {
    key: input.key,
    uploadUrl,
    headers: { 'Content-Type': input.contentType },
    expiresAt: new Date(
      Date.now() + UPLOAD_TICKET_TTL_SECONDS * 1000
    ).toISOString(),
  };
}

export async function objectExists(key: string) {
  try {
    await objectStorageClient().send(
      new HeadObjectCommand({ Bucket: env.AWS_BUCKET_NAME, Key: key })
    );
    return true;
  } catch (error) {
    if (error instanceof NotFound) return false;
    throw error;
  }
}

export async function deleteObject(key: string) {
  await objectStorageClient().send(
    new DeleteObjectCommand({ Bucket: env.AWS_BUCKET_NAME, Key: key })
  );
}

/** Inclusive byte range. Used to read an image header without the whole file. */
export async function readObjectRange(key: string, start: number, end: number) {
  const response = await objectStorageClient().send(
    new GetObjectCommand({
      Bucket: env.AWS_BUCKET_NAME,
      Key: key,
      Range: `bytes=${start}-${end}`,
    })
  );
  if (!response.Body) return Buffer.alloc(0);
  return Buffer.from(await response.Body.transformToByteArray());
}
