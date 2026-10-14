export const QR_TICKET_BACKGROUND_PATH =
  '/images/emails/email-qr-background.jpg';

// White ticket area in the background (952x936), stored as ratios so any
// export size of the same artwork lines up.
const TICKET_QR_AREA = {
  left: 176 / 952,
  right: 776 / 952,
  bottom: 888 / 936,
};
const TICKET_QR_INSET_RATIO = 52 / 600;

/** Dot radius relative to one QR module; finder patterns stay square. */
export const QR_DOT_RADIUS_RATIO = 0.42;

export function isQrFinderCell(x: number, y: number, matrixSize: number) {
  const inTopLeft = x <= 6 && y <= 6;
  const inTopRight = x >= matrixSize - 7 && y <= 6;
  const inBottomLeft = x <= 6 && y >= matrixSize - 7;
  return inTopLeft || inTopRight || inBottomLeft;
}

/** Where the QR sits on the ticket background, in background pixels. */
export function ticketQrRect(width: number, height: number) {
  const areaLeft = width * TICKET_QR_AREA.left;
  const areaWidth = width * (TICKET_QR_AREA.right - TICKET_QR_AREA.left);
  const inset = areaWidth * TICKET_QR_INSET_RATIO;
  const size = Math.round(areaWidth - inset * 2);

  return {
    x: Math.round(areaLeft + inset),
    y: Math.round(height * TICKET_QR_AREA.bottom - inset - size),
    size,
  };
}
