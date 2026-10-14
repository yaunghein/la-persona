// Inline styles shared by the event emails (designs use Red Hat Display, ink #00041f).
export const ink = 'color: #00041f';
// text-wrap evens out lines where supported (Apple Mail); templates also join
// each paragraph's last two words with &nbsp; so no client ends on one word.
export const bodyStyle = `margin: 0; font-size: 14px; line-height: 1.5; letter-spacing: 1.4px; text-wrap: pretty; ${ink}`;
export const titleStyle = `margin: 0; font-size: 20px; line-height: 1.5; letter-spacing: 2px; text-transform: uppercase; font-weight: 400; text-align: center; text-wrap: balance; ${ink}`;
export const boxStyle = 'border: 1px solid rgba(18, 18, 18, 0.1)';
export const fullWidthImageStyle = 'display: block; width: 100%; height: auto';

/** Absolute URL for an image in public/images/emails; empty base keeps it relative for preview. */
export function emailAsset(assetBaseUrl: string, name: string) {
  return `${assetBaseUrl}/images/emails/${name}`;
}

/**
 * Joins the last two words of each line with a non-breaking space, so text
 * passed in from the server never ends a paragraph on a single word.
 */
export function noWidows(text: string) {
  return text
    .split('\n')
    .map((line) =>
      line.trim().split(/\s+/).length >= 3
        ? line.replace(/\s+(\S+)\s*$/, '\u00A0$1')
        : line
    )
    .join('\n');
}
