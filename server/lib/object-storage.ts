import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { env } from '~~/env';
import type {
  UploadContentType,
  UploadTicket,
} from '~~/shared/contracts/media';

const UPLOAD_TICKET_TTL_SECONDS = 60;

const FILE_EXTENSIONS: Record<UploadContentType, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

let client: S3Client | undefined;

function objectStorageClient() {
  client ??= new S3Client({
    region: env.AWS_REGION,
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
  keyPrefix: string;
  contentType: UploadContentType;
  contentLength: number;
}): Promise<UploadTicket> {
  const key = `${input.keyPrefix}/${crypto.randomUUID()}.${FILE_EXTENSIONS[input.contentType]}`;
  const command = new PutObjectCommand({
    Bucket: env.AWS_BUCKET_NAME,
    Key: key,
    ContentType: input.contentType,
    ContentLength: input.contentLength,
  });
  const uploadUrl = await getSignedUrl(objectStorageClient(), command, {
    expiresIn: UPLOAD_TICKET_TTL_SECONDS,
    signableHeaders: new Set(['content-type', 'content-length']),
  });
  return {
    key,
    uploadUrl,
    headers: { 'Content-Type': input.contentType },
    expiresAt: new Date(
      Date.now() + UPLOAD_TICKET_TTL_SECONDS * 1000
    ).toISOString(),
  };
}
