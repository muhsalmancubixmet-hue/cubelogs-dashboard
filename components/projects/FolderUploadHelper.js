import JSZip from 'jszip';

export const ALLOWED_ATTACHMENT_EXTENSIONS = [
  // Images
  '.jpg', '.jpeg', '.png', '.webp', '.gif', '.bmp', '.ico', '.tiff', '.tif',
  // Documents & Data
  '.pdf', '.txt', '.csv', '.rtf', '.md', '.log', '.json', '.xml',
  '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx',
  '.odt', '.ods', '.odp',
  // Archives
  '.zip', '.rar', '.7z', '.tar', '.gz',
  // Video & Audio
  '.mp4', '.webm', '.mov', '.mkv', '.avi',
  '.mp3', '.wav', '.ogg', '.m4a', '.aac', '.flac'
];

export const FORBIDDEN_ATTACHMENT_KEYWORDS = [
  '.php', '.html', '.htm', '.js', '.exe', '.sh', '.bat', '.cmd',
  '.py', '.pl', '.jsp', '.asp', '.aspx', '.phtml', '.svg'
];

export const PROHIBITED_EXTENSIONS = FORBIDDEN_ATTACHMENT_KEYWORDS;

export const MAX_FOLDER_FILES = 1000;
export const MAX_FOLDER_SOURCE_BYTES = 50 * 1024 * 1024; // 50MB source limit
export const MAX_FOLDER_ZIP_BYTES = 10 * 1024 * 1024; // 10MB archive limit

/**
 * Sanitizes folder/archive name into safe filename characters.
 */
export function sanitizeArchiveName(name) {
  if (!name || typeof name !== 'string') return 'folder';
  const clean = name
    .trim()
    .replace(/[<>:"/\\|?*\x00-\x1F.]/g, '_')
    .replace(/^_+/, '')
    .replace(/_+$/, '')
    .trim();
  return clean || 'folder';
}

/**
 * Validates a single member's relative path and extension.
 */
export function validateMemberPathAndType(relPath) {
  if (!relPath || typeof relPath !== 'string') {
    throw new Error('Invalid file path in folder.');
  }

  const rawPath = relPath.trim();
  const normPath = rawPath.replace(/\\/g, '/');

  // Check path traversal & absolute paths
  if (
    normPath.startsWith('/') ||
    rawPath.startsWith('\\') ||
    normPath.includes('../') ||
    rawPath.includes('..\\') ||
    normPath.split('/').includes('..') ||
    /^[a-zA-Z]:/.test(rawPath)
  ) {
    throw new Error(`Unsafe path traversal detected in folder: "${rawPath}".`);
  }

  // Check prohibited extensions & dangerous keywords (case-insensitive)
  const segments = normPath.split('/');
  const rawFileName = segments[segments.length - 1];
  const fileName = rawFileName.toLowerCase();
  const lowerPath = normPath.toLowerCase();

  for (const forbidden of FORBIDDEN_ATTACHMENT_KEYWORDS) {
    if (fileName.includes(forbidden) || lowerPath.includes(forbidden)) {
      throw new Error(`Folder contains prohibited file: "${rawFileName}". Prohibited types: HTML, JS, SVG, executables, and scripts.`);
    }
  }

  // Check canonical allowed extensions (case-insensitive)
  const lastDotIndex = rawFileName.lastIndexOf('.');
  const ext = lastDotIndex !== -1 ? rawFileName.slice(lastDotIndex).toLowerCase() : '';
  if (!ALLOWED_ATTACHMENT_EXTENSIONS.includes(ext)) {
    throw new Error(`Folder contains unsupported file: "${rawFileName}". Extension '${ext}' is not supported.`);
  }

  // Reject nested ZIP files inside folders
  if (ext === '.zip') {
    throw new Error('ZIP files inside folders are not supported.');
  }

  return normPath;
}

/**
 * Reads File object into Uint8Array safely across browser and test environments.
 */
export async function readFileAsUint8Array(file) {
  if (typeof file.arrayBuffer === 'function') {
    const buffer = await file.arrayBuffer();
    return new Uint8Array(buffer);
  }
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(new Uint8Array(reader.result));
    reader.onerror = () => reject(new Error(`Failed to read file: ${file.name}`));
    reader.readAsArrayBuffer(file);
  });
}

export const SYSTEM_FILES_TO_IGNORE = [
  'desktop.ini', 'thumbs.db', '.ds_store', 'ehthumbs.db', 'icon\r'
];

/**
 * Packages a selected directory of files into a single valid PKZIP File object.
 *
 * @param {FileList|File[]} filesList - Selected directory files with webkitRelativePath
 * @returns {Promise<File>} - Packaged ZIP File object
 */
export async function packageFolderToZip(filesList, options = {}) {
  const rawFiles = Array.from(filesList || []).filter(Boolean);
  const maxBytes = options.maxBytes || MAX_FOLDER_ZIP_BYTES;
  const maxFiles = options.maxFiles || MAX_FOLDER_FILES;
  const maxSourceBytes = options.maxSourceBytes || MAX_FOLDER_SOURCE_BYTES;

  // Filter out system files (e.g. desktop.ini on Windows, .DS_Store on macOS)
  const files = rawFiles.filter(f => {
    const rawPath = f.webkitRelativePath || f.name || '';
    const norm = rawPath.replace(/\\/g, '/');
    const fileName = norm.split('/').pop().toLowerCase();
    return !SYSTEM_FILES_TO_IGNORE.includes(fileName) && !norm.toLowerCase().includes('__macosx/');
  });

  if (files.length === 0) {
    throw new Error('No files found in the selected folder.');
  }

  // Precheck 1: Member file count limit (UX/memory precheck matching backend archive abuse limit)
  if (files.length > maxFiles) {
    throw new Error('Folder contains too many files. Maximum is 1000.');
  }

  // Precheck 2: Total source file bytes limit (UX/memory precheck matching backend uncompressed limit)
  const totalSourceBytes = files.reduce((acc, file) => acc + (file.size || 0), 0);
  if (totalSourceBytes > maxSourceBytes) {
    throw new Error('Folder contents exceed the 50MB preparation limit.');
  }

  // Determine root folder name from first relative path
  const firstPath = files[0].webkitRelativePath || files[0].name || '';
  const firstNorm = firstPath.replace(/\\/g, '/');
  const pathParts = firstNorm.split('/').filter(Boolean);
  const rootFolderName = pathParts.length > 1 ? pathParts[0] : (firstNorm.split('.')[0] || 'folder');
  const safeArchiveName = `${sanitizeArchiveName(rootFolderName)}.zip`;

  // Package files asynchronously using JSZip
  const zip = new JSZip();
  for (const file of files) {
    const rawPath = file.webkitRelativePath || file.name;
    const normPath = validateMemberPathAndType(rawPath);
    const u8 = await readFileAsUint8Array(file);
    zip.file(normPath, u8);
  }

  const zipData = await zip.generateAsync({
    type: 'uint8array',
    compression: 'DEFLATE',
    compressionOptions: { level: 6 }
  });

  if (zipData.length > maxBytes) {
    throw new Error('Folder archive exceeds the 10MB attachment limit.');
  }

  // Create standard File object
  const zipBlob = new Blob([zipData], { type: 'application/zip' });
  const zipFile = new File([zipBlob], safeArchiveName, {
    type: 'application/zip',
    lastModified: Date.now(),
  });

  return zipFile;
}
