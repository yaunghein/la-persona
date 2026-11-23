import { communityUsesCardImageKeys } from '~~/server/features/organization/community-setting.repository';
import { companyUsesCardImageKeys } from '~~/server/features/organization/company.service';
import {
  createUploadTicket,
  deleteObject,
  listObjectKeys,
  objectExists,
} from '~~/server/lib/object-storage';
import { FILE_EXTENSIONS } from '~~/server/features/media/media.service';
import { THAKHIN_CARD_PLAN_ASSET_DEFAULTS } from '~~/shared/constants/thakhin-card-plan-assets';
import {
  CARD_IMAGE_KINDS,
  UPLOAD_CONTENT_TYPES,
  type CardImage,
  type CardImageKind,
  type CreateCardImageUploadRequest,
  type StoredUpload,
  type UploadContentType,
} from '~~/shared/contracts/media';
import { cardImageSlug } from '~~/shared/utils/card-image';
import { resolveObjectStorageUrl } from '~~/shared/utils/object-storage';

/** Slugs already used by the shared standard and friends-and-family artwork. */
function reservedSlugs() {
  const slugs = new Set<string>();
  for (const assets of Object.values(THAKHIN_CARD_PLAN_ASSET_DEFAULTS)) {
    for (const key of [assets.wallpaperS3Key, assets.cardBackS3Key]) {
      const match = key.match(/^uploads\/(?:wallpaper|back)-([^.]+)\./);
      if (match?.[1]) slugs.add(match[1]);
    }
  }
  return slugs;
}

function keysForSlug(slug: string) {
  return CARD_IMAGE_KINDS.flatMap((kind) =>
    UPLOAD_CONTENT_TYPES.map(
      (contentType) => `uploads/${kind}-${slug}.${FILE_EXTENSIONS[contentType]}`
    )
  );
}

async function requireCardImageSlug(name: string) {
  const slug = cardImageSlug(name);
  if (!slug) {
    throw badRequest(
      'Enter a name that can be used in the file name.',
      'card_image_name'
    );
  }
  if (
    reservedSlugs().has(slug) ||
    (await communityUsesCardImageKeys(keysForSlug(slug))) ||
    (await companyUsesCardImageKeys(keysForSlug(slug)))
  ) {
    throw conflict(
      `${slug} is a shared design. Use a different name.`,
      'card_image_reserved'
    );
  }
  return slug;
}

/** Named from the person, whatever the uploaded file was called. */
function cardImageAt(
  kind: CardImageKind,
  slug: string,
  contentType: UploadContentType,
  exists: boolean
): CardImage {
  const fileName = `${kind}-${slug}.${FILE_EXTENSIONS[contentType]}`;
  const key = `uploads/${fileName}`;
  return {
    kind,
    fileName,
    key,
    url: resolveObjectStorageUrl(key),
    exists,
  };
}

/** The extension follows the uploaded type, so every allowed one is checked. */
async function findCardImage(kind: CardImageKind, slug: string) {
  const candidates = UPLOAD_CONTENT_TYPES.map((contentType) =>
    cardImageAt(kind, slug, contentType, false)
  );
  const found = await Promise.all(
    candidates.map((image) => objectExists(image.key))
  );
  const index = found.indexOf(true);
  return index === -1
    ? { ...candidates[0]!, fileName: `${kind}-${slug}` }
    : { ...candidates[index]!, exists: true };
}

export async function listCardImages(name: string) {
  const slug = await requireCardImageSlug(name);
  return Promise.all(CARD_IMAGE_KINDS.map((kind) => findCardImage(kind, slug)));
}

/** Upload never overwrites: the current file has to be deleted first. */
export async function issueCardImageUploadTicket(
  request: CreateCardImageUploadRequest
) {
  const slug = await requireCardImageSlug(request.name);
  const existing = await findCardImage(request.kind, slug);
  if (existing.exists) {
    throw conflict(
      `${existing.fileName} already exists. Delete it before uploading a new one.`,
      'card_image_exists'
    );
  }
  const image = cardImageAt(request.kind, slug, request.contentType, false);
  const ticket = await createUploadTicket({
    key: image.key,
    contentType: request.contentType,
    contentLength: request.contentLength,
  });
  return { image, ticket };
}

export async function deleteCardImage(kind: CardImageKind, name: string) {
  const slug = await requireCardImageSlug(name);
  const image = await findCardImage(kind, slug);
  if (image.exists) await deleteObject(image.key);
  return image;
}

const STORED_UPLOAD_KEY = /^uploads\/[^/]+\.(?:webp|jpe?g|png)$/i;

/** Images already in uploads/, so a new card can reuse one. */
export async function listStoredUploads(): Promise<StoredUpload[]> {
  const keys = await listObjectKeys('uploads/');
  return keys
    .filter((key) => STORED_UPLOAD_KEY.test(key))
    .map((key) => ({
      key,
      fileName: key.slice('uploads/'.length),
      url: resolveObjectStorageUrl(key),
    }))
    .sort((a, b) => a.fileName.localeCompare(b.fileName));
}
