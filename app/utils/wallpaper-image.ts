const QR_SIZE_RATIO = 0.3;
const QR_PADDING_RATIO = 0.05;
const QR_IMAGE_CORNER_RADIUS_PX = 16;

export type WallpaperImageOptions = {
  wallpaperProxyUrl: string;
  cardUrl: string;
  width?: number;
  height?: number;
  qrColor?: string;
  qrBorderOpacity?: number;
  qrLayerBgColor?: string;
  qrLayerBgOpacity?: number;
};

const DEFAULTS = {
  qrColor: '#000000',
  qrBorderOpacity: 0,
  qrLayerBgColor: '#ffffff',
  qrLayerBgOpacity: 1,
};

function fillStrokeAndDrawQrInRoundedFrame(
  context: CanvasRenderingContext2D,
  styledQr: HTMLCanvasElement,
  qrFrameX: number,
  qrFrameY: number,
  qrFrameSize: number,
  qrX: number,
  qrY: number,
  qrSize: number,
  fillCss: string,
  borderWidth: number,
  strokeCss: string
) {
  const r = Math.min(QR_IMAGE_CORNER_RADIUS_PX, qrFrameSize / 2);

  context.fillStyle = fillCss;
  context.beginPath();
  context.roundRect(qrFrameX, qrFrameY, qrFrameSize, qrFrameSize, r);
  context.fill();

  context.save();
  context.beginPath();
  context.roundRect(qrFrameX, qrFrameY, qrFrameSize, qrFrameSize, r);
  context.clip();
  context.drawImage(styledQr, qrX, qrY, qrSize, qrSize);
  context.restore();

  const half = borderWidth / 2;
  const sx = qrFrameX + half;
  const sy = qrFrameY + half;
  const sw = qrFrameSize - borderWidth;
  const sh = qrFrameSize - borderWidth;
  const strokeR = Math.min(Math.max(0, r - half), sw / 2, sh / 2);

  context.imageSmoothingEnabled = true;
  context.strokeStyle = strokeCss;
  context.lineWidth = borderWidth;
  context.beginPath();
  context.roundRect(sx, sy, sw, sh, strokeR);
  context.stroke();
}

export function wallpaperFileSegment(input?: string) {
  return (input || 'card').replace(/[^a-z0-9-_]+/gi, '-').toLowerCase();
}

function loadImage(url: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    if (!url.startsWith('data:')) {
      image.crossOrigin = 'anonymous';
    }
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('Failed to load image'));
    image.src = url;
  });
}

function getCenterCropRect(
  sourceWidth: number,
  sourceHeight: number,
  targetWidth: number,
  targetHeight: number
) {
  const sourceAspect = sourceWidth / sourceHeight;
  const targetAspect = targetWidth / targetHeight;

  if (sourceAspect > targetAspect) {
    const cropWidth = sourceHeight * targetAspect;
    return {
      sx: (sourceWidth - cropWidth) / 2,
      sy: 0,
      sw: cropWidth,
      sh: sourceHeight,
    };
  }

  const cropHeight = sourceWidth / targetAspect;
  return {
    sx: 0,
    sy: (sourceHeight - cropHeight) / 2,
    sw: sourceWidth,
    sh: cropHeight,
  };
}

function hexToRgba(hex: string, alpha: number) {
  const normalized = hex.replace('#', '');
  const r = Number.parseInt(normalized.slice(0, 2), 16);
  const g = Number.parseInt(normalized.slice(2, 4), 16);
  const b = Number.parseInt(normalized.slice(4, 6), 16);
  const a = Math.max(0, Math.min(1, alpha));
  return `rgba(${r}, ${g}, ${b}, ${a})`;
}

function hexToRgb(hex: string) {
  const normalized = hex.replace('#', '');
  return {
    r: Number.parseInt(normalized.slice(0, 2), 16),
    g: Number.parseInt(normalized.slice(2, 4), 16),
    b: Number.parseInt(normalized.slice(4, 6), 16),
  };
}

function isFinderCell(x: number, y: number, matrixSize: number) {
  const inTopLeft = x <= 6 && y <= 6;
  const inTopRight = x >= matrixSize - 7 && y <= 6;
  const inBottomLeft = x <= 6 && y >= matrixSize - 7;
  return inTopLeft || inTopRight || inBottomLeft;
}

async function createStyledQrCanvas(
  cardUrl: string,
  targetSize: number,
  colorHex: string
) {
  const qrModule = await import('qrcode');
  const qrFactory = (qrModule as any).default || qrModule;
  const qr = qrFactory.create(cardUrl, {
    errorCorrectionLevel: 'H',
    margin: 0,
  });

  const matrixSize = qr.modules.size as number;
  const matrixData = qr.modules.data as ArrayLike<number | boolean>;
  const moduleSize = targetSize / matrixSize;
  const dotRadius = moduleSize * 0.42;
  const { r, g, b } = hexToRgb(colorHex);

  const qrCanvas = document.createElement('canvas');
  qrCanvas.width = targetSize;
  qrCanvas.height = targetSize;
  const qrContext = qrCanvas.getContext('2d');
  if (!qrContext) throw new Error('QR canvas context unavailable');

  qrContext.fillStyle = `rgba(${r}, ${g}, ${b}, 1)`;
  qrContext.imageSmoothingEnabled = true;
  qrContext.imageSmoothingQuality = 'high';

  for (let y = 0; y < matrixSize; y += 1) {
    for (let x = 0; x < matrixSize; x += 1) {
      const index = y * matrixSize + x;
      const cell = matrixData[index];
      const isDark = cell === true || cell === 1;
      if (!isDark) continue;

      const drawX = x * moduleSize;
      const drawY = y * moduleSize;

      if (isFinderCell(x, y, matrixSize)) {
        qrContext.fillRect(drawX, drawY, moduleSize, moduleSize);
        continue;
      }

      qrContext.beginPath();
      qrContext.arc(
        drawX + moduleSize / 2,
        drawY + moduleSize / 2,
        dotRadius,
        0,
        Math.PI * 2
      );
      qrContext.fill();
    }
  }

  return qrCanvas;
}

export function canvasToPngBlob(canvas: HTMLCanvasElement) {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((result) => {
      if (!result) {
        reject(new Error('Failed to create image file'));
        return;
      }
      resolve(result);
    }, 'image/png');
  });
}

export async function renderWallpaperCanvas(options: WallpaperImageOptions) {
  if (!options.wallpaperProxyUrl || !options.cardUrl) {
    throw new Error('Wallpaper preview is incomplete');
  }

  const qrColor = options.qrColor || DEFAULTS.qrColor;
  const qrBorderOpacity = options.qrBorderOpacity ?? DEFAULTS.qrBorderOpacity;
  const qrLayerBgColor = options.qrLayerBgColor || DEFAULTS.qrLayerBgColor;
  const qrLayerBgOpacity =
    options.qrLayerBgOpacity ?? DEFAULTS.qrLayerBgOpacity;

  const [image, styledQr] = await Promise.all([
    loadImage(options.wallpaperProxyUrl),
    createStyledQrCanvas(options.cardUrl, 1024, qrColor),
  ]);
  const width = options.width || image.naturalWidth;
  const height = options.height || image.naturalHeight;
  const crop = getCenterCropRect(
    image.naturalWidth,
    image.naturalHeight,
    width,
    height
  );

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;

  const context = canvas.getContext('2d');
  if (!context) throw new Error('Canvas context unavailable');

  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = 'high';
  context.drawImage(
    image,
    crop.sx,
    crop.sy,
    crop.sw,
    crop.sh,
    0,
    0,
    width,
    height
  );

  const qrSize = Math.round(Math.min(width, height) * QR_SIZE_RATIO);
  const qrPadding = Math.max(12, Math.round(qrSize * QR_PADDING_RATIO));
  const qrFrameSize = qrSize + qrPadding * 2;
  const qrFrameX = (width - qrFrameSize) / 2;
  const qrFrameY = (height - qrFrameSize) / 2;
  const qrX = (width - qrSize) / 2;
  const qrY = (height - qrSize) / 2;
  const borderWidth = Math.max(2, Math.round(qrFrameSize * 0.015));

  fillStrokeAndDrawQrInRoundedFrame(
    context,
    styledQr,
    qrFrameX,
    qrFrameY,
    qrFrameSize,
    qrX,
    qrY,
    qrSize,
    hexToRgba(qrLayerBgColor, qrLayerBgOpacity),
    borderWidth,
    hexToRgba(qrColor, qrBorderOpacity)
  );

  return canvas;
}

export async function renderQrCanvas(options: {
  cardUrl: string;
  qrColor?: string;
  qrBorderOpacity?: number;
  qrLayerBgColor?: string;
  qrLayerBgOpacity?: number;
}) {
  if (!options.cardUrl) throw new Error('QR is not ready');

  const qrColor = options.qrColor || DEFAULTS.qrColor;
  const qrBorderOpacity = options.qrBorderOpacity ?? DEFAULTS.qrBorderOpacity;
  const qrLayerBgColor = options.qrLayerBgColor || DEFAULTS.qrLayerBgColor;
  const qrLayerBgOpacity =
    options.qrLayerBgOpacity ?? DEFAULTS.qrLayerBgOpacity;

  const canvasSize = 1024;
  const frameInset = Math.round(canvasSize * 0.04);
  const qrFrameX = frameInset;
  const qrFrameY = frameInset;
  const qrFrameSize = canvasSize - frameInset * 2;
  const qrPadding = Math.max(12, Math.round(qrFrameSize * QR_PADDING_RATIO));
  const qrSize = qrFrameSize - qrPadding * 2;
  const qrX = (canvasSize - qrSize) / 2;
  const qrY = (canvasSize - qrSize) / 2;
  const borderWidth = Math.max(2, Math.round(qrFrameSize * 0.015));
  const styledQr = await createStyledQrCanvas(options.cardUrl, qrSize, qrColor);

  const canvas = document.createElement('canvas');
  canvas.width = canvasSize;
  canvas.height = canvasSize;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('QR canvas context unavailable');

  fillStrokeAndDrawQrInRoundedFrame(
    context,
    styledQr,
    qrFrameX,
    qrFrameY,
    qrFrameSize,
    qrX,
    qrY,
    qrSize,
    hexToRgba(qrLayerBgColor, qrLayerBgOpacity),
    borderWidth,
    hexToRgba(qrColor, qrBorderOpacity)
  );

  return canvas;
}
