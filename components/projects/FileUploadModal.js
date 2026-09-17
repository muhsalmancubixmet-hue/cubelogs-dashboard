'use client';

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { X, UploadCloud, FileText, Image as ImageIcon, Film, FileArchive, AlertCircle, CheckCircle2, Folder, FolderArchive } from 'lucide-react';
import { packageFolderToZip, ALLOWED_ATTACHMENT_EXTENSIONS, FORBIDDEN_ATTACHMENT_KEYWORDS } from './FolderUploadHelper';

// Comprehensive allowed extensions
const COMPREHENSIVE_ALLOWED_EXTENSIONS = [
  ...ALLOWED_ATTACHMENT_EXTENSIONS,
  '.word', '.heic', '.heif', '.bmp', '.ico', '.tiff', '.tif',
  '.rtf', '.md', '.log', '.json', '.xml', '.sql',
  '.ppt', '.pptx', '.odt', '.ods', '.odp',
  '.rar', '.7z', '.tar', '.gz', '.bz2',
  '.mov', '.mkv', '.avi', '.m4v',
  '.mp3', '.wav', '.ogg', '.m4a', '.aac', '.flac'
];

function formatBytes(bytes, decimals = 1) {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

function getFileIcon(file) {
  const name = (file?.name || '').toLowerCase();
  const type = (file?.type || '').toLowerCase();

  if (type.startsWith('image/') || name.endsWith('.jpg') || name.endsWith('.jpeg') || name.endsWith('.png') || name.endsWith('.webp') || name.endsWith('.gif') || name.endsWith('.heic')) {
    return <ImageIcon size={20} color="#2563eb" />;
  }
  if (type.startsWith('video/') || name.endsWith('.mp4') || name.endsWith('.webm') || name.endsWith('.mov') || name.endsWith('.mkv')) {
    return <Film size={20} color="#7c3aed" />;
  }
  if (name.endsWith('.zip') || name.endsWith('.rar') || name.endsWith('.7z') || name.endsWith('.tar') || name.endsWith('.gz')) {
    return <FileArchive size={20} color="#d97706" />;
  }
  if (name.endsWith('.doc') || name.endsWith('.docx') || name.endsWith('.word') || name.endsWith('.odt') || name.endsWith('.rtf')) {
    return <FileText size={20} color="#2563eb" />;
  }
  if (name.endsWith('.xls') || name.endsWith('.xlsx') || name.endsWith('.csv') || name.endsWith('.ods')) {
    return <FileText size={20} color="#16a34a" />;
  }
  if (name.endsWith('.ppt') || name.endsWith('.pptx') || name.endsWith('.odp')) {
    return <FileText size={20} color="#ea580c" />;
  }
  return <FileText size={20} color="#059669" />;
}

// Recursively traverse directory entries from HTML5 drag and drop
async function readDirectoryRecursively(dirEntry, basePath = '') {
  const dirReader = dirEntry.createReader();
  const entries = await new Promise((resolve) => {
    const results = [];
    function readNext() {
      dirReader.readEntries((batch) => {
        if (!batch.length) {
          resolve(results);
        } else {
          results.push(...batch);
          readNext();
        }
      }, () => resolve(results));
    }
    readNext();
  });

  const files = [];
  for (const entry of entries) {
    if (entry.isFile) {
      const f = await new Promise((res) => entry.file(res, () => res(null)));
      if (f) {
        const lowerName = f.name.toLowerCase();
        // Skip hidden Windows / Mac OS system metadata files
        if (!['desktop.ini', 'thumbs.db', '.ds_store', 'ehthumbs.db'].includes(lowerName)) {
          Object.defineProperty(f, 'webkitRelativePath', {
            value: basePath + f.name,
            writable: false
          });
          files.push(f);
        }
      }
    } else if (entry.isDirectory) {
      const subFiles = await readDirectoryRecursively(entry, basePath + entry.name + '/');
      files.push(...subFiles);
    }
  }
  return files;
}

export default function FileUploadModal({
  isOpen,
  onClose,
  onUpload,
  maxFiles = 10,
  maxFileSize = 2 * 1024 * 1024 * 1024, // 2GB
}) {
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [validationError, setValidationError] = useState('');
  const fileInputRef = useRef(null);
  const folderInputRef = useRef(null);

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setSelectedFiles([]);
      setValidationError('');
      setIsDragOver(false);
      setIsProcessing(false);
    }
  }, [isOpen]);

  const validateAndAddFiles = useCallback(async (incomingFiles, fromDirectoryName = null) => {
    if (!incomingFiles || incomingFiles.length === 0) return;
    setValidationError('');

    // If incoming files come from a folder and exceed maxFiles, package into a single ZIP archive!
    let filesToProcess = Array.from(incomingFiles);
    if (fromDirectoryName && filesToProcess.length > maxFiles) {
      try {
        setIsProcessing(true);
        const zipFile = await packageFolderToZip(filesToProcess);
        filesToProcess = [zipFile];
      } catch (err) {
        console.error('Folder zip packaging error:', err);
        setValidationError(err.message || 'Failed to package folder as ZIP.');
        setIsProcessing(false);
        return;
      } finally {
        setIsProcessing(false);
      }
    }

    const newItems = filesToProcess.map((file) => {
      const rawName = file.name || 'file';
      const cleanName = rawName.toLowerCase();
      const lastDot = cleanName.lastIndexOf('.');
      const ext = lastDot !== -1 ? cleanName.slice(lastDot) : '';

      // Check forbidden scripts / executables
      const isForbidden = FORBIDDEN_ATTACHMENT_KEYWORDS.some((kw) => cleanName.includes(kw));
      // Allow known extensions or documents
      const isAllowedExt = !isForbidden && (COMPREHENSIVE_ALLOWED_EXTENSIONS.includes(ext) || ext === '' || ext === '.word');
      const isOverSize = file.size > maxFileSize;

      let error = '';
      if (isForbidden) {
        error = `Prohibited file type (${ext || rawName})`;
      } else if (!isAllowedExt) {
        error = `Unsupported format (${ext || rawName})`;
      } else if (isOverSize) {
        error = `Exceeds 2GB limit (${formatBytes(file.size)})`;
      }

      const previewUrl = (file.type && file.type.startsWith('image/')) ? URL.createObjectURL(file) : null;

      return {
        id: 'upload-' + Math.random().toString(36).substring(2, 9),
        file,
        name: rawName,
        size: file.size,
        previewUrl,
        isValid: isAllowedExt && !isOverSize,
        error
      };
    });

    setSelectedFiles((prev) => {
      const combined = [...prev, ...newItems];
      if (combined.length > maxFiles) {
        setValidationError(`Maximum ${maxFiles} attachments allowed per message. Please remove ${combined.length - maxFiles} file(s).`);
      }
      return combined;
    });
  }, [maxFiles, maxFileSize]);

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = async (e) => {
    e.preventDefault();
    setIsDragOver(false);

    const items = e.dataTransfer.items;
    if (items && items.length > 0) {
      setIsProcessing(true);
      try {
        const collectedFiles = [];
        for (let i = 0; i < items.length; i++) {
          const item = items[i];
          if (item.kind !== 'file') continue;
          const entry = item.webkitGetAsEntry ? item.webkitGetAsEntry() : null;

          if (entry) {
            if (entry.isDirectory) {
              const dirFiles = await readDirectoryRecursively(entry, entry.name + '/');
              if (dirFiles.length === 0) {
                setValidationError(`Folder "${entry.name}" is empty.`);
              } else if (dirFiles.length > maxFiles) {
                // Automatically package large directory into ZIP archive
                try {
                  const zipFile = await packageFolderToZip(dirFiles);
                  collectedFiles.push(zipFile);
                } catch (pkgErr) {
                  setValidationError(pkgErr.message || `Failed to prepare folder ${entry.name}`);
                }
              } else {
                collectedFiles.push(...dirFiles);
              }
            } else if (entry.isFile) {
              const f = await new Promise((res) => entry.file(res, () => res(null)));
              if (f) collectedFiles.push(f);
            }
          } else {
            const f = item.getAsFile();
            if (f) collectedFiles.push(f);
          }
        }

        if (collectedFiles.length > 0) {
          await validateAndAddFiles(collectedFiles);
        }
      } catch (err) {
        console.error('Error reading dropped files:', err);
        setValidationError('Failed to process dropped files.');
      } finally {
        setIsProcessing(false);
      }
    } else if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      validateAndAddFiles(e.dataTransfer.files);
    }
  };

  const handleFileInputChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      validateAndAddFiles(e.target.files);
    }
    e.target.value = '';
  };

  const handleFolderInputChange = async (e) => {
    const files = e.target.files;
    e.target.value = '';
    if (!files || files.length === 0) return;

    setIsProcessing(true);
    try {
      const filesList = Array.from(files).filter((f) => {
        const lower = f.name.toLowerCase();
        return !['desktop.ini', 'thumbs.db', '.ds_store', 'ehthumbs.db'].includes(lower);
      });

      if (filesList.length === 0) {
        setValidationError('Selected folder is empty.');
        return;
      }

      // If folder has <= 10 files, add them as individual files; otherwise package into ZIP
      if (filesList.length <= maxFiles) {
        await validateAndAddFiles(filesList);
      } else {
        const zipFile = await packageFolderToZip(filesList);
        await validateAndAddFiles([zipFile]);
      }
    } catch (err) {
      console.error('Folder selection error:', err);
      setValidationError(err.message || 'Failed to process selected folder.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRemoveItem = (id) => {
    setSelectedFiles((prev) => {
      const updated = prev.filter((item) => {
        if (item.id === id && item.previewUrl) {
          try { URL.revokeObjectURL(item.previewUrl); } catch (_) {}
        }
        return item.id !== id;
      });
      if (updated.length <= maxFiles && !updated.some((item) => !item.isValid)) {
        setValidationError('');
      }
      return updated;
    });
  };

  const handleClearAll = () => {
    selectedFiles.forEach((item) => {
      if (item.previewUrl) {
        try { URL.revokeObjectURL(item.previewUrl); } catch (_) {}
      }
    });
    setSelectedFiles([]);
    setValidationError('');
  };

  const handlePackageSelectedAsZip = async () => {
    const validItems = selectedFiles.filter((item) => item.isValid);
    if (validItems.length <= 1) return;

    setIsProcessing(true);
    try {
      const files = validItems.map((item) => item.file);
      const zipFile = await packageFolderToZip(files);
      handleClearAll();
      await validateAndAddFiles([zipFile]);
    } catch (err) {
      console.error('Packaging error:', err);
      setValidationError(err.message || 'Failed to package files into ZIP.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleConfirmUpload = () => {
    const validItems = selectedFiles.filter((item) => item.isValid);
    if (validItems.length === 0) return;
    if (validItems.length > maxFiles) {
      setValidationError(`Please limit attachments to ${maxFiles} files maximum.`);
      return;
    }

    onUpload(validItems.map((item) => item.file));
    onClose();
  };

  if (!isOpen) return null;

  const validCount = selectedFiles.filter((f) => f.isValid).length;
  const hasInvalid = selectedFiles.some((f) => !f.isValid);
  const isOverLimit = selectedFiles.length > maxFiles;
  const canUpload = validCount > 0 && !hasInvalid && !isOverLimit && !isProcessing;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-shell upload-modal-shell"
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: 600,
          background: '#ffffff',
          borderRadius: 14,
          boxShadow: '0 20px 35px -10px rgba(0, 0, 0, 0.2), 0 1px 3px rgba(0, 0, 0, 0.05)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          maxHeight: '88vh'
        }}
      >
        {/* Modal Header */}
        <div
          className="modal-header"
          style={{
            padding: '16px 20px',
            borderBottom: '1px solid #e2e8f0',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            background: '#ffffff'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                background: '#eff6ff',
                color: '#2563eb',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}
            >
              <UploadCloud size={20} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#0f172a' }}>
                Upload Attachments
              </h3>
              <p style={{ margin: 0, fontSize: 12, color: '#64748b' }}>
                Upload files, documents, media, or folders to this discussion
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: '#64748b',
              fontSize: 18,
              cursor: 'pointer',
              padding: 6,
              borderRadius: 6,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <div
          className="modal-body"
          style={{
            padding: '18px 20px',
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: 16
          }}
        >
          {/* Drag & Drop Zone */}
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            style={{
              border: isDragOver ? '2px dashed #2563eb' : '2px dashed #cbd5e1',
              borderRadius: 12,
              padding: '26px 18px',
              textAlign: 'center',
              background: isDragOver ? '#f0f7ff' : '#f8fafc',
              transition: 'all 0.15s ease',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 12
            }}
          >
            {/* Hidden Input for Files */}
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept={COMPREHENSIVE_ALLOWED_EXTENSIONS.join(',')}
              onChange={handleFileInputChange}
              style={{ display: 'none' }}
            />

            {/* Hidden Input for Folders */}
            <input
              ref={folderInputRef}
              type="file"
              webkitdirectory=""
              directory=""
              multiple
              onChange={handleFolderInputChange}
              style={{ display: 'none' }}
            />

            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: '50%',
                background: '#e0e7ff',
                color: '#4338ca',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <UploadCloud size={26} />
            </div>

            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#1e293b', marginBottom: 4 }}>
                Drag and drop files or folders here
              </div>
              <div style={{ fontSize: 12, color: '#64748b' }}>
                Supports all documents, Word, Excel, PPT, PDF, images, videos, audio & archives (Up to 2GB each)
              </div>
            </div>

            {/* Action Buttons: Browse Files & Browse Folder */}
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'center' }}>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isProcessing}
                style={{
                  padding: '7px 14px',
                  borderRadius: 8,
                  border: '1px solid #cbd5e1',
                  background: '#ffffff',
                  color: '#1e293b',
                  fontSize: 12.5,
                  fontWeight: 600,
                  cursor: isProcessing ? 'wait' : 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
                }}
              >
                <FileText size={15} color="#2563eb" />
                Browse Files
              </button>

              <button
                type="button"
                onClick={() => folderInputRef.current?.click()}
                disabled={isProcessing}
                style={{
                  padding: '7px 14px',
                  borderRadius: 8,
                  border: '1px solid #cbd5e1',
                  background: '#ffffff',
                  color: '#1e293b',
                  fontSize: 12.5,
                  fontWeight: 600,
                  cursor: isProcessing ? 'wait' : 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
                }}
              >
                <Folder size={15} color="#d97706" />
                Browse Folder
              </button>
            </div>

            {isProcessing && (
              <div style={{ fontSize: 12, color: '#2563eb', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
                <span className="loader-dot"></span> Reading and preparing files...
              </div>
            )}
          </div>

          {/* Validation Banner */}
          {validationError && (
            <div
              style={{
                padding: '10px 14px',
                borderRadius: 8,
                background: '#fef2f2',
                border: '1px solid #fecaca',
                color: '#991b1b',
                fontSize: 12.5,
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: 8
              }}
            >
              <AlertCircle size={16} style={{ flexShrink: 0 }} />
              <span>{validationError}</span>
            </div>
          )}

          {/* Selected Files Header */}
          {selectedFiles.length > 0 && (
            <div>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: 8
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: '#0f172a' }}>
                    Selected Files
                  </span>
                  <span
                    style={{
                      fontSize: 11.5,
                      fontWeight: 700,
                      padding: '2px 8px',
                      borderRadius: 12,
                      background: isOverLimit ? '#fee2e2' : '#e0f2fe',
                      color: isOverLimit ? '#b91c1c' : '#0369a1'
                    }}
                  >
                    {selectedFiles.length} / {maxFiles}
                  </span>
                </div>
                <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                  {selectedFiles.length > 1 && (
                    <button
                      type="button"
                      onClick={handlePackageSelectedAsZip}
                      disabled={isProcessing}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#d97706',
                        fontSize: 12,
                        fontWeight: 600,
                        cursor: isProcessing ? 'wait' : 'pointer',
                        padding: 0,
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 4
                      }}
                    >
                      <FolderArchive size={13} /> Package as ZIP
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={handleClearAll}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#dc2626',
                      fontSize: 12,
                      fontWeight: 600,
                      cursor: 'pointer',
                      padding: 0
                    }}
                  >
                    Clear all
                  </button>
                </div>
              </div>

              {/* Files Queue List */}
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 6,
                  maxHeight: 220,
                  overflowY: 'auto',
                  paddingRight: 4
                }}
              >
                {selectedFiles.map((item) => (
                  <div
                    key={item.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '8px 12px',
                      borderRadius: 8,
                      border: item.isValid ? '1px solid #e2e8f0' : '1px solid #fca5a5',
                      background: item.isValid ? '#ffffff' : '#fff5f5',
                      gap: 10
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0, flex: 1 }}>
                      {item.previewUrl ? (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img
                          src={item.previewUrl}
                          alt={item.name}
                          style={{
                            width: 32,
                            height: 32,
                            borderRadius: 6,
                            objectFit: 'cover',
                            flexShrink: 0
                          }}
                        />
                      ) : (
                        <div
                          style={{
                            width: 32,
                            height: 32,
                            borderRadius: 6,
                            background: '#f1f5f9',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0
                          }}
                        >
                          {getFileIcon(item.file)}
                        </div>
                      )}
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div
                          style={{
                            fontSize: 12.5,
                            fontWeight: 600,
                            color: '#1e293b',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis'
                          }}
                        >
                          {item.name}
                        </div>
                        <div style={{ fontSize: 11, color: '#64748b' }}>
                          {formatBytes(item.size)}
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                      {item.isValid ? (
                        <span
                          style={{
                            fontSize: 11,
                            fontWeight: 600,
                            color: '#15803d',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 3
                          }}
                        >
                          <CheckCircle2 size={13} /> Ready
                        </span>
                      ) : (
                        <span
                          style={{
                            fontSize: 11,
                            fontWeight: 600,
                            color: '#b91c1c',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 3
                          }}
                        >
                          <AlertCircle size={13} /> {item.error}
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={() => handleRemoveItem(item.id)}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: '#94a3b8',
                          cursor: 'pointer',
                          padding: 3,
                          borderRadius: 4,
                          display: 'flex'
                        }}
                      >
                        <X size={15} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div
          className="modal-footer"
          style={{
            padding: '12px 20px',
            borderTop: '1px solid #e2e8f0',
            display: 'flex',
            justifyContent: 'flex-end',
            alignItems: 'center',
            gap: 10,
            background: '#f8fafc'
          }}
        >
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: '9px 16px',
              borderRadius: 8,
              border: '1px solid #cbd5e1',
              background: '#ffffff',
              color: '#475569',
              fontWeight: 600,
              fontSize: 13,
              cursor: 'pointer',
              minHeight: 38
            }}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirmUpload}
            disabled={!canUpload}
            style={{
              padding: '9px 20px',
              borderRadius: 8,
              border: 'none',
              background: canUpload
                ? 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)'
                : '#cbd5e1',
              color: '#ffffff',
              fontWeight: 700,
              fontSize: 13,
              cursor: canUpload ? 'pointer' : 'not-allowed',
              boxShadow: canUpload ? '0 2px 6px rgba(37, 99, 235, 0.3)' : 'none',
              minHeight: 38,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6
            }}
          >
            <UploadCloud size={16} />
            {validCount > 0 ? `Upload ${validCount} File${validCount > 1 ? 's' : ''}` : 'Upload Files'}
          </button>
        </div>
      </div>

      <style jsx>{`
        :global(:root.dark) .upload-modal-shell {
          background: #1e293b !important;
          border: 1px solid #334155;
        }
        :global(:root.dark) .modal-header,
        :global(:root.dark) .modal-footer {
          background: #0f172a !important;
          border-color: #334155 !important;
        }
        :global(:root.dark) .modal-header h3 {
          color: #f8fafc !important;
        }
      `}</style>
    </div>
  );
}
