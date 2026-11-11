import { open } from 'node:fs/promises';
import { resolve, sep } from 'node:path';
import { parseImageHeader } from '~~/server/lib/image-header';
import { readObjectRange } from '~~/server/lib/object-storage';
import type { ImageDimensions } from '~~/shared/contracts/event';
import { objectStorageKey } from '~~/shared/utils/object-storage';

const HEADER_BYTES = 64 * 1024;
const MAX_CHUNKS = 4;

// Object keys are unique per upload and never rewritten.
const cache = new Map<string, ImageDimensions>();

function localImageFile(urlPath: string) {
  if (!urlPath.startsWith('/images/') || urlPath.includes('..')) return null;
  const root = resolve(process.cwd(), 'public');
  const file = resolve(root, urlPath.slice(1));
  if (file !== root && !file.startsWith(`${root}${sep}`)) return null;
  return file;
}

async function readFileRange(file: string, start: number, end: number) {
  const handle = await open(file, 'r');
  try {
    const length = end - start + 1;
    const buffer = Buffer.alloc(length);
    const { bytesRead } = await handle.read(buffer, 0, length, start);
    return buffer.subarray(0, bytesRead);
  } finally {
    await handle.close();
  }
}

async function sizeFromRanges(
  read: (start: number, end: number) => Promise<Buffer>
) {
  let start = 0;
  let orientation: number | undefined;
  for (let attempt = 0; attempt < MAX_CHUNKS; attempt++) {
    const bytes = await read(start, start + HEADER_BYTES - 1);
    if (!bytes.length) return null;
    const parsed = parseImageHeader(bytes, start, orientation);
    orientation = parsed.orientation ?? orientation;
    if (parsed.size) return parsed.size;
    if (parsed.resumeAt == null || parsed.resumeAt <= start) return null;
    start = parsed.resumeAt;
  }
  return null;
}

async function loadImageSize(stored: string): Promise<ImageDimensions | null> {
  const key = objectStorageKey(stored.trim());
  if (!key || key.includes('..')) return null;

  try {
    if (key.startsWith('/')) {
      const file = localImageFile(key);
      if (!file) return null;
      return await sizeFromRanges((start, end) => readFileRange(file, start, end));
    }
    if (/^https?:/i.test(key)) return null;
    return await sizeFromRanges((start, end) => readObjectRange(key, start, end));
  } catch {
    return null;
  }
}

/** Intrinsic display size for each stored event image, keyed by the stored value. */
export async function readEventImageSizes(keys: string[]) {
  const unique = [...new Set(keys.map((key) => key.trim()).filter(Boolean))];
  const pairs = await Promise.all(
    unique.map(async (key) => {
      const cached = cache.get(key);
      if (cached) return [key, cached] as const;
      const size = await loadImageSize(key);
      if (size) cache.set(key, size);
      return [key, size] as const;
    })
  );
  return Object.fromEntries(
    pairs.filter((pair): pair is [string, ImageDimensions] => pair[1] != null)
  );
}
