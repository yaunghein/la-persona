function guessMimeType(fileName: string, fallback?: string) {
  const extension = fileName.split('.').pop()?.toLowerCase();
  if (extension === 'png') return 'image/png';
  if (extension === 'jpg' || extension === 'jpeg') return 'image/jpeg';
  if (extension === 'webp') return 'image/webp';
  if (extension === 'vcf') return 'text/vcard';
  if (extension === 'csv') return 'text/csv';
  return fallback || 'application/octet-stream';
}

function isShareAbortError(error: unknown) {
  return error instanceof DOMException && error.name === 'AbortError';
}

function canShareFiles(files: File[]) {
  if (typeof navigator === 'undefined') return false;
  if (typeof navigator.canShare !== 'function') return false;
  if (typeof navigator.share !== 'function') return false;

  try {
    return navigator.canShare({ files });
  } catch {
    return false;
  }
}

function downloadBlob(blob: Blob, fileName: string) {
  const objectUrl = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = objectUrl;
  anchor.download = fileName;
  anchor.rel = 'noopener';
  anchor.style.display = 'none';
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(objectUrl);
}

async function fetchTypedBlob(url: string, fileName: string) {
  const response = await fetch(url, { mode: 'cors' });
  if (!response.ok) {
    throw new Error('Failed to download file');
  }

  const blob = await response.blob();
  return blob.type && blob.type !== 'application/octet-stream'
    ? blob
    : new Blob([blob], { type: guessMimeType(fileName, blob.type) });
}

export function downloadFile(input: { blob: Blob; fileName: string }) {
  downloadBlob(input.blob, input.fileName);
}

export async function downloadUrl(input: { url: string; fileName: string }) {
  const blob = await fetchTypedBlob(input.url, input.fileName);
  downloadFile({ blob, fileName: input.fileName });
}

export async function shareOrDownloadFile(input: {
  blob: Blob;
  fileName: string;
}) {
  const type = input.blob.type || guessMimeType(input.fileName);
  const file = new File([input.blob], input.fileName, { type });

  if (canShareFiles([file])) {
    try {
      await navigator.share({ files: [file] });
      return;
    } catch (error) {
      if (isShareAbortError(error)) return;
    }
  }

  downloadFile(input);
}

export async function shareOrDownloadUrl(input: {
  url: string;
  fileName: string;
}) {
  const blob = await fetchTypedBlob(input.url, input.fileName);
  await shareOrDownloadFile({
    blob,
    fileName: input.fileName,
  });
}
