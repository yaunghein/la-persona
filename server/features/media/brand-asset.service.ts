import { env } from '~~/env';
import { findOrganizationById } from '~~/server/features/organization/community.repository';
import {
  ensureCommunitySetting,
  upsertCommunitySettingByOrganizationId,
} from '~~/server/features/organization/community-setting.repository';
import {
  createUploadTicket,
  deleteObject,
  objectExists,
} from '~~/server/lib/object-storage';
import {
  BRAND_ASSET_KINDS,
  type BrandAsset,
  type BrandAssetKind,
  type CreateBrandAssetUploadRequest,
} from '~~/shared/contracts/media';

const SETTING_FIELDS = {
  wallpaper: 'wallpaperUrl',
  back: 'cardBackUrl',
} as const satisfies Record<BrandAssetKind, string>;

async function findCommunity(organizationId: string) {
  const organization = await findOrganizationById(organizationId);
  if (!organization) throw notFound('Organization');
  assertCommunityOrganization(organization);
  return organization;
}

async function findBrandAsset(
  kind: BrandAssetKind,
  slug: string
): Promise<BrandAsset> {
  // Named by the community slug, whatever the uploaded file was called.
  const fileName = `${kind}-${slug}.webp`;
  const key = `uploads/${fileName}`;
  return {
    kind,
    fileName,
    key,
    url: resolveObjectStorageUrl(key),
    exists: await objectExists(key),
  };
}

/** The upsert rewrites the copy fields, so they are passed through unchanged. */
async function updateBrandSetting(
  organizationId: string,
  field: (typeof SETTING_FIELDS)[BrandAssetKind],
  value: (current: string) => string
) {
  const setting = await ensureCommunitySetting(organizationId);
  if (!setting) throw notFound('Community settings');
  const next = value(setting[field]);
  if (next === setting[field]) return;
  await upsertCommunitySettingByOrganizationId(organizationId, {
    description: setting.description,
    guidelines: setting.guidelines,
    whyJoin: setting.whyJoin,
    coverUrl: setting.coverUrl,
    [field]: next,
  });
}

export async function listBrandAssets(organizationId: string) {
  const { slug } = await findCommunity(organizationId);
  return Promise.all(
    BRAND_ASSET_KINDS.map((kind) => findBrandAsset(kind, slug))
  );
}

/** Upload never overwrites: the current file has to be deleted first. */
export async function issueBrandAssetUploadTicket(
  organizationId: string,
  request: CreateBrandAssetUploadRequest
) {
  const { slug } = await findCommunity(organizationId);
  const asset = await findBrandAsset(request.kind, slug);
  if (asset.exists) {
    throw conflict(
      `${asset.fileName} already exists. Delete it before uploading a new one.`,
      'brand_asset_exists'
    );
  }
  const ticket = await createUploadTicket({
    key: asset.key,
    contentType: 'image/webp',
    contentLength: request.contentLength,
  });
  return { asset, ticket };
}

/** Points the community's wallpaper or card back at the uploaded file. */
export async function applyBrandAsset(
  organizationId: string,
  kind: BrandAssetKind
) {
  const { slug } = await findCommunity(organizationId);
  const asset = await findBrandAsset(kind, slug);
  if (!asset.exists) {
    throw conflict(
      `${asset.fileName} has not been uploaded.`,
      'brand_asset_missing'
    );
  }
  await updateBrandSetting(
    organizationId,
    SETTING_FIELDS[kind],
    () => asset.key
  );
  return asset;
}

/** Deletes the file and falls back to the platform default if it was in use. */
export async function deleteBrandAsset(
  organizationId: string,
  kind: BrandAssetKind
) {
  const { slug } = await findCommunity(organizationId);
  const asset = await findBrandAsset(kind, slug);
  if (asset.exists) await deleteObject(asset.key);

  const fallback =
    kind === 'wallpaper'
      ? env.DEFAULT_WALLPAPER_URL
      : env.DEFAULT_CARD_BACK_URL;
  await updateBrandSetting(organizationId, SETTING_FIELDS[kind], (current) =>
    [asset.key, asset.url].includes(current) ? fallback : current
  );
  return asset;
}
