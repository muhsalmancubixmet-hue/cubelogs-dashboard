'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import { getTiptapExtensions } from './richTextExtensions';
import TiptapToolbar from './TiptapToolbar';
import RichTextTableMenu from './RichTextTableMenu';
import RichTextLinkModal from './RichTextLinkModal';
import { sanitizeRichTextHtml } from './richTextSanitizer';
import { normalizeMediaUrl, validateImageFile, validateAttachmentFile, dataUriToFile, isCubeLogsAttachmentUrl } from './richTextMedia';
import { apiFetch } from '../../lib/api/apiClient';
import { downloadAuthenticatedFile, viewAuthenticatedPdf } from '../projects/AuthenticatedMediaPreview';

export default function TiptapEditor({
  value = '',
  onChange,
  placeholder = 'Write details...',
  disabled = false,
  readOnly = false,
  preset = 'standard',
  minHeight = 180,
  targetType = null,
  contextType = 'project',
  contextId = null,
  projectId = null,
  epicId = null,
  storyId = null,
  taskId = null,
  draftToken = null,
  enableImages = true,
  enableTables = true,
  enableCodeBlocks = true,
  onAttachmentUploaded = null,
}) {
  const [mounted, setMounted] = useState(false);
  const [isLinkModalOpen, setIsLinkModalOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const lastEmittedValueRef = useRef(value);
  const editorRef = useRef(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Determine target entity type & persisted target ID or draftToken
  let effectiveTargetType = targetType;
  let targetId = null;

  if (effectiveTargetType === 'task') {
    targetId = taskId || null;
  } else if (effectiveTargetType === 'story') {
    targetId = storyId || null;
  } else if (effectiveTargetType === 'epic') {
    targetId = epicId || null;
  } else if (effectiveTargetType === 'project') {
    targetId = projectId || contextId || null;
  } else if (effectiveTargetType === 'sprint') {
    targetId = projectId || contextId || null;
  } else {
    // Inferred when targetType is not explicitly supplied:
    if (taskId !== undefined && taskId !== null) {
      effectiveTargetType = 'task';
      targetId = taskId;
    } else if (storyId !== undefined && storyId !== null) {
      effectiveTargetType = 'story';
      targetId = storyId;
    } else if (epicId !== undefined && epicId !== null) {
      effectiveTargetType = 'epic';
      targetId = epicId;
    } else if ((projectId !== undefined && projectId !== null) || (contextId !== undefined && contextId !== null)) {
      effectiveTargetType = 'project';
      targetId = projectId || contextId;
    }
  }

  const hasTargetId = Boolean(targetId || draftToken);

  const uploadFileToBackend = useCallback(async (file, isInline = true) => {
    if (!file) return null;

    if (!hasTargetId) {
      setUploadError('Save this item first to upload images or attachments.');
      return null;
    }

    setUploading(true);
    setUploadError('');

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('is_inline', isInline ? 'true' : 'false');

      // Fulfills Rule 9: Target exactly one entity or temporary draft_token
      if (draftToken && !targetId) {
        formData.append('draft_token', draftToken);
      } else if (effectiveTargetType === 'task' && taskId) {
        formData.append('task', taskId);
      } else if (effectiveTargetType === 'story' && storyId) {
        formData.append('story', storyId);
      } else if (effectiveTargetType === 'epic' && epicId) {
        formData.append('epic', epicId);
      } else if (projectId || contextId || targetId) {
        formData.append('project', projectId || contextId || targetId);
      }

      const data = await apiFetch('/v1/attachments/', {
        method: 'POST',
        body: formData,
      });

      setUploading(false);
      return data;
    } catch (err) {
      setUploading(false);
      setUploadError(err.message || 'Failed to upload file');
      return null;
    }
  }, [hasTargetId, draftToken, effectiveTargetType, projectId, epicId, storyId, taskId, contextId, targetId]);

  const handleImageFileSelect = useCallback(async (file) => {
    if (!hasTargetId) {
      setUploadError('Save this item first to upload images or attachments.');
      return;
    }

    const check = validateImageFile(file);
    if (!check.valid) {
      setUploadError(check.error);
      return;
    }

    const uploaded = await uploadFileToBackend(file, true);
    if (uploaded && (uploaded.file_url || uploaded.url)) {
      const fullUrl = normalizeMediaUrl(uploaded.file_url || uploaded.url);
      const activeEditor = editorRef.current;
      if (activeEditor) {
        activeEditor.chain().focus().setImage({
          src: fullUrl,
          alt: uploaded.file_name || uploaded.name || 'Uploaded image',
          dataAttachmentId: uploaded.id,
        }).run();
      }
    }
  }, [hasTargetId, uploadFileToBackend]);

  const handleAttachmentFileSelect = useCallback(async (file) => {
    if (!hasTargetId) {
      setUploadError('Save this item first to upload images or attachments.');
      return;
    }

    const check = validateAttachmentFile(file);
    if (!check.valid) {
      setUploadError(check.error);
      return;
    }

    const uploaded = await uploadFileToBackend(file, false);
    if (uploaded) {
      if (onAttachmentUploaded) {
        onAttachmentUploaded(uploaded);
      }
      const fileUrl = normalizeMediaUrl(uploaded.file_url || uploaded.url);
      const activeEditor = editorRef.current;
      if (activeEditor) {
        activeEditor.chain().focus().insertContent(
          `<p><a href="${fileUrl}" target="_blank" rel="noopener noreferrer" data-attachment-id="${uploaded.id}">📎 ${uploaded.file_name || uploaded.name} (${Math.round((uploaded.file_size || uploaded.size_bytes || 0) / 1024)} KB)</a></p>`
        ).run();
      }
    }
  }, [hasTargetId, uploadFileToBackend, onAttachmentUploaded]);

  const handlePastedHtmlWithBase64 = useCallback(async (html) => {
    if (!hasTargetId) {
      setUploadError('Save this item first to upload images or attachments.');
      return;
    }

    try {
      if (typeof window === 'undefined' || typeof DOMParser === 'undefined') {
        return;
      }
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, 'text/html');
      const imgs = Array.from(doc.querySelectorAll('img')).filter(img => {
        const src = img.getAttribute('src') || '';
        return /^data:image\/[^,;]+(?:\s*;\s*[^,;]+)*\s*;\s*base64\s*,/i.test(src.trim());
      });

      if (imgs.length === 0) return;

      let anyFailed = false;

      for (let i = 0; i < imgs.length; i++) {
        const img = imgs[i];
        const src = img.getAttribute('src') || '';
        const alt = img.getAttribute('alt') || `pasted-image-${i + 1}`;
        try {
          const file = dataUriToFile(src, alt);
          const uploaded = await uploadFileToBackend(file, true);
          if (!uploaded || (!uploaded.file_url && !uploaded.url)) {
            throw new Error('Upload failed');
          }
          const fullUrl = normalizeMediaUrl(uploaded.file_url || uploaded.url);
          img.setAttribute('src', fullUrl);
          img.setAttribute('data-attachment-id', String(uploaded.id));
        } catch (err) {
          anyFailed = true;
          // Fail-safe: DO NOT insert the raw base64 string into editor content
          img.remove();
        }
      }

      if (anyFailed) {
        setUploadError('Unable to add this image.');
      }

      const activeEditor = editorRef.current;
      if (activeEditor) {
        const cleanHtml = doc.body.innerHTML;
        if (cleanHtml && cleanHtml.trim()) {
          activeEditor.commands.insertContent(cleanHtml);
        }
      }
    } catch (err) {
      setUploadError('Unable to add this image.');
    }
  }, [hasTargetId, uploadFileToBackend]);

  const handlePastedBase64Text = useCallback(async (text) => {
    if (!hasTargetId) {
      setUploadError('Save this item first to upload images or attachments.');
      return;
    }

    try {
      const file = dataUriToFile(text, 'pasted-image');
      const uploaded = await uploadFileToBackend(file, true);
      if (!uploaded || (!uploaded.file_url && !uploaded.url)) {
        throw new Error('Upload failed');
      }
      const fullUrl = normalizeMediaUrl(uploaded.file_url || uploaded.url);
      const activeEditor = editorRef.current;
      if (activeEditor) {
        activeEditor.chain().focus().setImage({
          src: fullUrl,
          alt: uploaded.file_name || uploaded.name || 'Uploaded image',
          dataAttachmentId: uploaded.id,
        }).run();
      }
    } catch (err) {
      // Fail-safe: DO NOT insert raw base64 into editor
      setUploadError('Unable to add this image.');
    }
  }, [hasTargetId, uploadFileToBackend]);

  const handlePastedHtmlWithBase64Ref = useRef(handlePastedHtmlWithBase64);
  const handlePastedBase64TextRef = useRef(handlePastedBase64Text);
  const handleImageFileSelectRef = useRef(handleImageFileSelect);

  useEffect(() => {
    handlePastedHtmlWithBase64Ref.current = handlePastedHtmlWithBase64;
    handlePastedBase64TextRef.current = handlePastedBase64Text;
    handleImageFileSelectRef.current = handleImageFileSelect;
  }, [handlePastedHtmlWithBase64, handlePastedBase64Text, handleImageFileSelect]);

  const editor = useEditor({
    immediatelyRender: false,
    editable: !disabled && !readOnly,
    extensions: getTiptapExtensions({
      placeholder,
      enableImages,
      enableTables,
      enableCodeBlocks,
    }),
    content: sanitizeRichTextHtml(value),
    onUpdate: ({ editor }) => {
      const html = editor.getHTML();
      const sanitized = sanitizeRichTextHtml(html);
      lastEmittedValueRef.current = sanitized;
      if (onChange) {
        onChange(sanitized);
      }
    },
    editorProps: {
      handlePaste: (view, event) => {
        const clipboard = event.clipboardData;
        if (!clipboard) return false;

        // 1. Check for HTML containing base64 images
        const html = clipboard.getData('text/html');
        if (html && /data:image\/[^,;]+(?:\s*;\s*[^,;]+)*\s*;\s*base64\s*,/i.test(html)) {
          event.preventDefault();
          if (!hasTargetId) {
            setUploadError('Save this item first to upload images or attachments.');
            return true;
          }
          handlePastedHtmlWithBase64Ref.current(html);
          return true;
        }

        // 2. Check for plain text containing raw data:image URI
        const text = clipboard.getData('text/plain')?.trim();
        if (text && /^data:image\/[^,;]+(?:\s*;\s*[^,;]+)*\s*;\s*base64\s*,/i.test(text)) {
          event.preventDefault();
          if (!hasTargetId) {
            setUploadError('Save this item first to upload images or attachments.');
            return true;
          }
          handlePastedBase64TextRef.current(text);
          return true;
        }

        // 3. Existing file paste (screenshots, copied image files)
        const items = clipboard.items;
        if (items) {
          for (let i = 0; i < items.length; i++) {
            const item = items[i];
            if (item.kind === 'file' && item.type.startsWith('image/')) {
              const file = item.getAsFile();
              if (file) {
                event.preventDefault();
                if (!hasTargetId) {
                  setUploadError('Save this item first to upload images or attachments.');
                  return true;
                }
                handleImageFileSelectRef.current(file);
                return true;
              }
            }
          }
        }
        return false;
      },
      handleDrop: (view, event) => {
        const files = event.dataTransfer?.files;
        if (!files || files.length === 0) return false;
        const file = files[0];
        if (file.type.startsWith('image/')) {
          event.preventDefault();
          if (!hasTargetId) {
            setUploadError('Save this item first to upload images or attachments.');
            return true;
          }
          handleImageFileSelectRef.current(file);
          return true;
        }
        return false;
      },
      handleClick: (view, pos, event) => {
        const target = event.target;
        const linkEl = target.closest ? target.closest('a') : (target.tagName === 'A' ? target : null);
        if (linkEl) {
          const href = linkEl.getAttribute('href') || '';
          const hasAttachmentId = linkEl.hasAttribute('data-attachment-id');
          if (hasAttachmentId || isCubeLogsAttachmentUrl(href)) {
            event.preventDefault();
            const text = (linkEl.textContent || '').trim();
            const cleanName = text.replace(/^[^\w.-]+/g, '').trim() || 'attachment';
            if (cleanName.toLowerCase().endsWith('.pdf') || href.toLowerCase().includes('.pdf')) {
              viewAuthenticatedPdf(href);
            } else {
              downloadAuthenticatedFile(href, cleanName);
            }
            return true;
          }
        }
        return false;
      },
    },
  }, [disabled, readOnly, placeholder, hasTargetId]);

  useEffect(() => {
    editorRef.current = editor;
  }, [editor]);

  // Sync external value changes safely without infinite loops
  useEffect(() => {
    if (!editor) return;
    const sanitizedVal = sanitizeRichTextHtml(value || '');
    if (sanitizedVal !== lastEmittedValueRef.current && sanitizedVal !== editor.getHTML()) {
      lastEmittedValueRef.current = sanitizedVal;
      editor.commands.setContent(sanitizedVal, false);
    }
  }, [value, editor]);

  const handleSaveLink = ({ url, text }) => {
    setIsLinkModalOpen(false);
    const activeEditor = editorRef.current || editor;
    if (!activeEditor) return;
    if (text) {
      activeEditor.chain().focus().insertContent(`<a href="${url}" target="_blank" rel="noopener noreferrer">${text}</a>`).run();
    } else {
      activeEditor.chain().focus().extendMarkRange('link').setLink({ href: url, target: '_blank', rel: 'noopener noreferrer' }).run();
    }
  };

  if (!mounted) {
    return (
      <div style={{
        minHeight: `${minHeight}px`, border: '1px solid var(--border-color, #cbd5e1)',
        borderRadius: '8px', background: 'var(--bg-input, #ffffff)', padding: '12px'
      }}>
        Loading editor...
      </div>
    );
  }

  const containerStyle = {
    position: isFullscreen ? 'fixed' : 'relative',
    inset: isFullscreen ? 0 : 'auto',
    zIndex: isFullscreen ? 99999 : 'auto',
    background: 'var(--bg-card, #ffffff)',
    border: '1px solid var(--border-color, #cbd5e1)',
    borderRadius: '8px',
    display: 'flex',
    flexDirection: 'column',
  };

  return (
    <div className={`tiptap-wrapper ${isFullscreen ? 'fullscreen' : ''}`} style={containerStyle}>
      <TiptapToolbar
        editor={editor}
        preset={preset}
        onOpenLinkModal={() => setIsLinkModalOpen(true)}
        onImageSelected={handleImageFileSelect}
        onAttachmentSelected={handleAttachmentFileSelect}
        isFullscreen={isFullscreen}
        onToggleFullscreen={() => setIsFullscreen(!isFullscreen)}
        uploading={uploading}
        hasTargetId={hasTargetId}
      />

      {uploading && (
        <div style={{ padding: '4px 12px', fontSize: '0.8rem', background: '#eff6ff', color: '#1d4ed8' }}>
          Uploading file...
        </div>
      )}

      {uploadError && (
        <div style={{ padding: '4px 12px', fontSize: '0.8rem', background: '#fef2f2', color: '#dc2626' }}>
          {uploadError}
        </div>
      )}

      <div style={{ padding: '8px 12px', flex: 1, overflowY: 'auto' }}>
        <RichTextTableMenu editor={editor} />
        <EditorContent editor={editor} style={{ minHeight: `${minHeight}px`, outline: 'none' }} />
      </div>

      <RichTextLinkModal
        isOpen={isLinkModalOpen}
        initialUrl={editor?.getAttributes('link').href || ''}
        initialText={editor ? editor.state.doc.textBetween(editor.state.selection.from, editor.state.selection.to) : ''}
        onSave={handleSaveLink}
        onClose={() => setIsLinkModalOpen(false)}
      />
    </div>
  );
}
