import { getBackendBaseUrl } from '../../lib/api/apiClient';

export function normalizeMediaUrl(url) {
  if (!url) return '';
  let str = String(url).trim();

  // If stored URL was incorrectly saved with a leading slash like /data:image...
  if (str.startsWith('/data:')) {
    str = str.slice(1);
  }

  // Preserve data:, blob:, http://, and https:// URLs unchanged
  if (
    str.startsWith('data:') ||
    str.startsWith('blob:') ||
    str.startsWith('http://') ||
    str.startsWith('https://')
  ) {
    return str;
  }

  // Only prepend backend base URL for relative paths such as /media/...
  if (str.startsWith('/')) {
    const backendBase = getBackendBaseUrl();
    return `${backendBase}${str}`;
  }

  return str;
}

/**
 * Checks if a URL points to an authenticated CubeLogs attachment download endpoint.
 */
export function isCubeLogsAttachmentUrl(url) {
  if (!url || typeof url !== 'string') return false;
  return /\/api\/v1\/attachments\/\d+\/download\/?/i.test(url);
}

export function validateImageFile(file) {
  if (!file) return { valid: false, error: 'No file selected.' };
  
  const allowedMimeTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
  if (!allowedMimeTypes.includes(file.type.toLowerCase())) {
    return { valid: false, error: 'Unsupported image format. Upload PNG, JPG, WEBP, or GIF.' };
  }

  const maxSize = 10 * 1024 * 1024; // 10 MB
  if (file.size > maxSize) {
    return { valid: false, error: 'Image exceeds the 10 MB upload limit.' };
  }

  return { valid: true, error: null };
}

export function validateAttachmentFile(file) {
  if (!file) return { valid: false, error: 'No file selected.' };

  const maxSize = 10 * 1024 * 1024; // 10 MB
  if (file.size > maxSize) {
    return { valid: false, error: 'Attachment exceeds the 10 MB upload limit.' };
  }

  return { valid: true, error: null };
}

export const ALLOWED_IMAGE_MIMES = {
  'image/jpeg': '.jpg',
  'image/jpg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/gif': '.gif',
};

/**
 * Parses a data URI into mime and base64 components.
 */
export function parseDataUri(dataUri) {
  if (!dataUri || typeof dataUri !== 'string') return null;
  const trimmed = dataUri.trim();
  const match = trimmed.match(/^data:([a-z0-9.+_-]+\/[a-z0-9.+_-]+)(?:;[^;,]+)*\s*;\s*base64\s*,(.+)$/is);
  if (!match) return null;
  return {
    mime: match[1].toLowerCase().trim(),
    base64Data: match[2].trim(),
  };
}

/**
 * Safely decodes a base64 data URI into a standard File object.
 * Enforces canonical allowed MIME types and 10MB limit.
 */
export function dataUriToFile(dataUri, fallbackFilename = 'pasted-image') {
  const parsed = parseDataUri(dataUri);
  if (!parsed) {
    throw new Error('Malformed data URI.');
  }

  const { mime, base64Data } = parsed;

  if (!ALLOWED_IMAGE_MIMES[mime]) {
    throw new Error(`Unsupported image format: ${mime}. Allowed formats: PNG, JPG, WEBP, GIF.`);
  }

  let binaryStr;
  try {
    if (typeof atob === 'function') {
      binaryStr = atob(base64Data);
    } else if (typeof Buffer !== 'undefined') {
      binaryStr = Buffer.from(base64Data, 'base64').toString('binary');
    } else {
      throw new Error('Base64 decoding not supported in this environment.');
    }
  } catch (e) {
    throw new Error('Invalid base64 encoding.');
  }

  const len = binaryStr.length;
  const maxSize = 10 * 1024 * 1024; // 10MB limit
  if (len > maxSize) {
    throw new Error('Decoded image exceeds the 10 MB attachment limit.');
  }

  const u8 = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    u8[i] = binaryStr.charCodeAt(i);
  }

  const ext = ALLOWED_IMAGE_MIMES[mime];
  const filename = fallbackFilename.endsWith(ext) ? fallbackFilename : `${fallbackFilename}${ext}`;

  return new File([u8], filename, { type: mime });
}
