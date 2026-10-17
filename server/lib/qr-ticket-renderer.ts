import QRCode from 'qrcode';
import sharp from 'sharp';
import {
  isQrFinderCell,
  QR_DOT_RADIUS_RATIO,
  QR_TICKET_BACKGROUND_PATH,
  ticketQrRect,
} from '~~/shared/utils/qr-ticket';

function styledQrSvg(value: string, size: number, color = '#000000') {
  const qr = QRCode.create(value, { errorCorrectionLevel: 'H' });
  const matrixSize = qr.modules.size as number;
  const matrixData = qr.modules.data as ArrayLike<number | boolean>;
  const moduleSize = size / matrixSize;
  const dotRadius = moduleSize * QR_DOT_RADIUS_RATIO;

  const shapes: string[] = [];
  for (let y = 0; y < matrixSize; y += 1) {
    for (let x = 0; x < matrixSize; x += 1) {
      const cell = matrixData[y * matrixSize + x];
      if (cell !== true && cell !== 1) continue;

      const drawX = x * moduleSize;
      const drawY = y * moduleSize;
      shapes.push(
        isQrFinderCell(x, y, matrixSize)
          ? `<rect x="${drawX}" y="${drawY}" width="${moduleSize}" height="${moduleSize}"/>`
          : `<circle cx="${drawX + moduleSize / 2}" cy="${drawY + moduleSize / 2}" r="${dotRadius}"/>`
      );
    }
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" fill="${color}">${shapes.join('')}</svg>`;
}

async function loadBackground(backgroundUrl?: string) {
  if (backgroundUrl) {
    const response = await fetch(backgroundUrl);
    if (!response.ok) throw new Error('QR ticket background unavailable');
    return response.arrayBuffer();
  }

  const fileName = QR_TICKET_BACKGROUND_PATH.split('/').pop()!;
  const fallback = await useStorage('assets:email-images').getItemRaw(fileName);
  if (!fallback) throw new Error('QR ticket background missing');
  return fallback;
}

/**
 * The card's QR on the email ticket background, as a PNG. Communities can
 * upload their own background; it must keep the default ticket layout.
 */
export async function renderQrTicketPng(
  cardUrl: string,
  backgroundUrl?: string
) {
  const background = await loadBackground(backgroundUrl);
  const image = sharp(Buffer.from(background));
  const { width = 0, height = 0 } = await image.metadata();
  const rect = ticketQrRect(width, height);

  return image
    .composite([
      {
        input: Buffer.from(styledQrSvg(cardUrl, rect.size)),
        left: rect.x,
        top: rect.y,
      },
    ])
    .png()
    .toBuffer();
}
