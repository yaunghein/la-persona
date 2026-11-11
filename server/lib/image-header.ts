export type ImageHeaderSize = {
  width: number;
  height: number;
};

export type ImageHeaderParse = {
  size: ImageHeaderSize | null;
  /** File offset of the next JPEG marker when this chunk ended mid-header. */
  resumeAt: number | null;
  orientation?: number;
};

const HEADER_LIMIT = 20_000;

function dimensions(
  width: number,
  height: number,
  orientation?: number
): ImageHeaderSize | null {
  if (
    !Number.isInteger(width) ||
    !Number.isInteger(height) ||
    width < 1 ||
    height < 1 ||
    width > HEADER_LIMIT ||
    height > HEADER_LIMIT
  ) {
    return null;
  }
  // Browsers display JPEG using the EXIF orientation. 5–8 swap the axes.
  if (orientation && orientation >= 5 && orientation <= 8) {
    return { width: height, height: width };
  }
  return { width, height };
}

function isPng(buffer: Buffer) {
  return (
    buffer.length >= 24 &&
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47
  );
}

function pngSize(buffer: Buffer): ImageHeaderSize | null {
  return dimensions(buffer.readUInt32BE(16), buffer.readUInt32BE(20));
}

function webpSize(buffer: Buffer): ImageHeaderSize | null {
  if (buffer.length < 30) return null;
  if (buffer.toString('ascii', 0, 4) !== 'RIFF') return null;
  if (buffer.toString('ascii', 8, 12) !== 'WEBP') return null;

  let offset = 12;
  while (offset + 8 <= buffer.length) {
    const type = buffer.toString('ascii', offset, offset + 4);
    const chunkSize = buffer.readUInt32LE(offset + 4);
    const data = offset + 8;

    if (type === 'VP8X' && data + 10 <= buffer.length) {
      const byte = (index: number) => buffer[index] ?? 0;
      const width =
        1 +
        (byte(data + 4) | (byte(data + 5) << 8) | (byte(data + 6) << 16));
      const height =
        1 +
        (byte(data + 7) | (byte(data + 8) << 8) | (byte(data + 9) << 16));
      return dimensions(width, height);
    }

    if (
      type === 'VP8 ' &&
      data + 10 <= buffer.length &&
      buffer[data + 3] === 0x9d &&
      buffer[data + 4] === 0x01 &&
      buffer[data + 5] === 0x2a
    ) {
      return dimensions(
        buffer.readUInt16LE(data + 6) & 0x3fff,
        buffer.readUInt16LE(data + 8) & 0x3fff
      );
    }

    if (
      type === 'VP8L' &&
      data + 5 <= buffer.length &&
      buffer[data] === 0x2f
    ) {
      const bits = buffer.readUInt32LE(data + 1);
      return dimensions((bits & 0x3fff) + 1, ((bits >> 14) & 0x3fff) + 1);
    }

    const next = data + chunkSize + (chunkSize & 1);
    if (next <= offset) return null;
    offset = next;
  }

  return null;
}

function exifOrientation(payload: Buffer): number | undefined {
  if (payload.length < 16 || payload.toString('ascii', 0, 4) !== 'Exif') {
    return;
  }
  const tiff = 6;
  const little = payload[tiff] === 0x49 && payload[tiff + 1] === 0x49;
  const big = payload[tiff] === 0x4d && payload[tiff + 1] === 0x4d;
  if (!little && !big) return;

  const read16 = (position: number) =>
    little ? payload.readUInt16LE(position) : payload.readUInt16BE(position);
  const read32 = (position: number) =>
    little ? payload.readUInt32LE(position) : payload.readUInt32BE(position);
  if (tiff + 8 > payload.length || read16(tiff + 2) !== 42) return;

  const ifd = tiff + read32(tiff + 4);
  if (ifd + 2 > payload.length) return;
  const count = read16(ifd);
  for (let index = 0; index < count; index++) {
    const entry = ifd + 2 + index * 12;
    if (entry + 12 > payload.length) return;
    if (read16(entry) === 0x0112) return read16(entry + 8);
  }
}

function isSof(marker: number) {
  return (
    (marker >= 0xc0 && marker <= 0xc3) ||
    (marker >= 0xc5 && marker <= 0xc7) ||
    (marker >= 0xc9 && marker <= 0xcb) ||
    (marker >= 0xcd && marker <= 0xcf)
  );
}

function parseJpeg(
  buffer: Buffer,
  fileOffset: number,
  orientation?: number
): ImageHeaderParse {
  let offset = 0;
  if (fileOffset === 0) {
    if (buffer.length < 4 || buffer[0] !== 0xff || buffer[1] !== 0xd8) {
      return { size: null, resumeAt: null, orientation };
    }
    offset = 2;
  }

  while (offset + 1 < buffer.length) {
    if (buffer[offset] !== 0xff) {
      return { size: null, resumeAt: null, orientation };
    }
    while (offset < buffer.length && buffer[offset] === 0xff) offset++;
    if (offset >= buffer.length) {
      return { size: null, resumeAt: fileOffset + offset - 1, orientation };
    }

    const marker = buffer[offset]!;
    const markerAt = offset - 1;
    // Markers with no length field.
    if (
      marker === 0x01 ||
      marker === 0xd8 ||
      marker === 0xd9 ||
      (marker >= 0xd0 && marker <= 0xd7)
    ) {
      offset += 1;
      continue;
    }
    // Start of scan: entropy-coded bytes follow, and SOF always comes first.
    if (marker === 0xda) {
      return { size: null, resumeAt: null, orientation };
    }
    if (markerAt + 4 > buffer.length) {
      return { size: null, resumeAt: fileOffset + markerAt, orientation };
    }

    const length = buffer.readUInt16BE(markerAt + 2);
    if (length < 2) return { size: null, resumeAt: null, orientation };
    const next = markerAt + 2 + length;

    if (isSof(marker)) {
      if (markerAt + 9 > buffer.length) {
        return { size: null, resumeAt: fileOffset + markerAt, orientation };
      }
      return {
        size: dimensions(
          buffer.readUInt16BE(markerAt + 7),
          buffer.readUInt16BE(markerAt + 5),
          orientation
        ),
        resumeAt: null,
        orientation,
      };
    }

    if (marker === 0xe1 && orientation == null) {
      const end = Math.min(next, buffer.length);
      orientation =
        exifOrientation(buffer.subarray(markerAt + 4, end)) ?? orientation;
    }

    if (next > buffer.length) {
      return { size: null, resumeAt: fileOffset + next, orientation };
    }
    offset = next;
  }

  return {
    size: null,
    resumeAt: fileOffset + Math.max(offset - 1, 0),
    orientation,
  };
}

/**
 * Width and height from the start of a JPEG, PNG, or WebP file.
 * `fileOffset` is where `buffer` sits in the file, so a JPEG SOF that
 * follows a long EXIF segment can be read from a later chunk.
 */
export function parseImageHeader(
  buffer: Buffer,
  fileOffset = 0,
  orientation?: number
): ImageHeaderParse {
  if (fileOffset === 0) {
    if (isPng(buffer)) {
      return { size: pngSize(buffer), resumeAt: null, orientation };
    }
    if (
      buffer.length >= 12 &&
      buffer.toString('ascii', 0, 4) === 'RIFF' &&
      buffer.toString('ascii', 8, 12) === 'WEBP'
    ) {
      return { size: webpSize(buffer), resumeAt: null, orientation };
    }
  }
  if (fileOffset === 0 && (buffer[0] !== 0xff || buffer[1] !== 0xd8)) {
    return { size: null, resumeAt: null, orientation };
  }
  return parseJpeg(buffer, fileOffset, orientation);
}
