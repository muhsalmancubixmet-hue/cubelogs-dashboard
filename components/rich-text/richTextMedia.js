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
