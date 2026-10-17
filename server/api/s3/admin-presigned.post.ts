import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { z } from 'zod';
import { requireAdminSession } from '~~/server/utils/admin-permissions';
import { env } from '~~/env';
import { enrichLog } from '~~/server/utils/wide-event';

const bodySchema = z.object({
  organizationId: z.string().min(1),
  fileType: z.string().startsWith('image/'),
  fileName: z.string().min(1),
});

// Thakhin uploads community assets without being a member of the community.
export default defineEventHandler(async (event) => {
  await requireAdminSession(event);

  const body = await readValidatedBody(event, bodySchema.safeParse);
  if (!body.success) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Validation failed',
      data: body.error.issues.map((issue) => issue.path.join('.')),
    });
  }

  const { organizationId, fileType, fileName } = body.data;
  enrichLog(event, {
    upload: { organization_id: organizationId, content_type: fileType },
  });

  const s3 = new S3Client({
    region: env.AWS_REGION,
    credentials: {
      accessKeyId: env.AWS_ACCESS_KEY,
      secretAccessKey: env.AWS_SECRET_ACCESS_KEY,
    },
  });

  const fileKey = `communities/${organizationId}/${Date.now()}-${fileName}`;
  const command = new PutObjectCommand({
    Bucket: env.AWS_BUCKET_NAME,
    Key: fileKey,
    ContentType: fileType,
  });

  const uploadUrl = await getSignedUrl(s3, command, { expiresIn: 60 });
  return { uploadUrl, fileKey };
});
