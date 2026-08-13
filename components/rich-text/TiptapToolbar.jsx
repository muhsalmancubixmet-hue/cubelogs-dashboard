'use client';

import React, { useRef } from 'react';
import {
  Bold, Italic, Underline, Strikethrough, RemoveFormatting,
  Heading1, Heading2, Heading3, List, ListOrdered, CheckSquare,
  Quote, Code, FileCode, Minus, Link as LinkIcon, Unlink,
  AlignLeft, AlignCenter, AlignRight, AlignJustify,
  Table as TableIcon, Image as ImageIcon, Paperclip, Maximize2, Minimize2
} from 'lucide-react';

export const TEXT_COLORS = [
  { name: 'Default', value: 'inherit', color: '#334155' },
  { name: 'Gray', value: '#64748b', color: '#64748b' },
  { name: 'Red', value: '#ef4444', color: '#ef4444' },
  { name: 'Orange', value: '#f97316', color: '#f97316' },
  { name: 'Yellow', value: '#eab308', color: '#eab308' },
  { name: 'Green', value: '#22c55e', color: '#22c55e' },
  { name: 'Blue', value: '#3b82f6', color: '#3b82f6' },
  { name: 'Purple', value: '#a855f7', color: '#a855f7' },
];

export const HIGHLIGHT_COLORS = [
  { name: 'None', value: 'transparent', color: 'transparent' },
  { name: 'Yellow', value: '#fef08a', color: '#fef08a' },
  { name: 'Green', value: '#bbf7d0', color: '#bbf7d0' },
  { name: 'Blue', value: '#bfdbfe', color: '#bfdbfe' },
  { name: 'Pink', value: '#fbcfe8', color: '#fbcfe8' },
  { name: 'Gray', value: '#e2e8f0', color: '#e2e8f0' },
];

export default function TiptapToolbar({
  editor,
  preset = 'standard',
  onOpenLinkModal,
  onImageSelected,
  onAttachmentSelected,
  isFullscreen,
  onToggleFullscreen,
  uploading = false,
  hasTargetId = true,
}) {
  const imageInputRef = useRef(null);
  const attachmentInputRef = useRef(null);

  if (!editor || preset === 'readOnly') {
    return null;
  }

  const isCompact = preset === 'compact';
  const isFull = preset === 'full';

  const btnStyle = (isActive = false, disabled = false) => ({
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '28px',
    height: '28px',
    padding: '4px',
    borderRadius: '4px',
    border: 'none',
    background: isActive ? 'var(--bg-active, #e2e8f0)' : 'transparent',
    color: disabled ? 'var(--text-disabled, #94a3b8)' : (isActive ? '#0f172a' : 'var(--text-secondary, #475569)'),
    cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.5 : 1,
    transition: 'background 0.15s ease',
  });

  const dividerStyle = {
    width: '1px',
    height: '18px',
    background: 'var(--border-color, #cbd5e1)',
    margin: '0 4px',
    alignSelf: 'center',
  };

  const handleImageFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file && onImageSelected && hasTargetId) {
      onImageSelected(file);
    }
    e.target.value = '';
  };

  const handleAttachmentFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file && onAttachmentSelected && hasTargetId) {
      onAttachmentSelected(file);
    }
    if (e.target) e.target.value = '';
  };

  return (
    <div className="tiptap-toolbar" style={{
      display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '2px',
      padding: '6px 8px', borderBottom: '1px solid var(--border-color, #e2e8f0)',
      background: 'var(--bg-toolbar, #f8fafc)', borderTopLeftRadius: '8px', borderTopRightRadius: '8px'
    }}>
      {/* Undo / Redo */}
      {!isCompact && (
        <>
          <button type="button" title="Undo" onClick={() => editor.chain().focus().undo().run()} disabled={!editor.can().undo()} style={btnStyle(false, !editor.can().undo())}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 14L4 9l5-5"/><path d="M4 9h10.5a5.5 5.5 0 0 1 5.5 5.5v0a5.5 5.5 0 0 1-5.5 5.5H11"/></svg>
          </button>
          <button type="button" title="Redo" onClick={() => editor.chain().focus().redo().run()} disabled={!editor.can().redo()} style={btnStyle(false, !editor.can().redo())}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 14l5-5-5-5"/><path d="M20 9H9.5A5.5 5.5 0 0 0 4 14.5v0A5.5 5.5 0 0 0 9.5 20H13"/></svg>
          </button>
          <div style={dividerStyle} />
        </>
      )}

      {/* Basic Text Formatting */}
      <button type="button" title="Bold" onClick={() => editor.chain().focus().toggleBold().run()} style={btnStyle(editor.isActive('bold'))}>
        <Bold size={15} />
      </button>
      <button type="button" title="Italic" onClick={() => editor.chain().focus().toggleItalic().run()} style={btnStyle(editor.isActive('italic'))}>
        <Italic size={15} />
      </button>
      <button type="button" title="Underline" onClick={() => editor.chain().focus().toggleUnderline().run()} style={btnStyle(editor.isActive('underline'))}>
        <Underline size={15} />
      </button>
      <button type="button" title="Strikethrough" onClick={() => editor.chain().focus().toggleStrike().run()} style={btnStyle(editor.isActive('strike'))}>
        <Strikethrough size={15} />
      </button>

      {!isCompact && (
        <button type="button" title="Clear Formatting" onClick={() => editor.chain().focus().unsetAllMarks().clearNodes().run()} style={btnStyle()}>
          <RemoveFormatting size={15} />
        </button>
      )}

      <div style={dividerStyle} />

      {/* Headings */}
      {!isCompact && (
        <>
          <button type="button" title="Heading 1" onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} style={btnStyle(editor.isActive('heading', { level: 1 }))}>
            <Heading1 size={15} />
          </button>
          <button type="button" title="Heading 2" onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} style={btnStyle(editor.isActive('heading', { level: 2 }))}>
            <Heading2 size={15} />
          </button>
          <button type="button" title="Heading 3" onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} style={btnStyle(editor.isActive('heading', { level: 3 }))}>
            <Heading3 size={15} />
          </button>
          <div style={dividerStyle} />
        </>
      )}

      {/* Lists */}
      <button type="button" title="Bullet List" onClick={() => editor.chain().focus().toggleBulletList().run()} style={btnStyle(editor.isActive('bulletList'))}>
        <List size={15} />
      </button>
      <button type="button" title="Numbered List" onClick={() => editor.chain().focus().toggleOrderedList().run()} style={btnStyle(editor.isActive('orderedList'))}>
        <ListOrdered size={15} />
      </button>
      <button type="button" title="Task List" onClick={() => editor.chain().focus().toggleTaskList().run()} style={btnStyle(editor.isActive('taskList'))}>
        <CheckSquare size={15} />
      </button>

      {!isCompact && (
        <>
          <button type="button" title="Blockquote" onClick={() => editor.chain().focus().toggleBlockquote().run()} style={btnStyle(editor.isActive('blockquote'))}>
            <Quote size={15} />
          </button>
          <button type="button" title="Inline Code" onClick={() => editor.chain().focus().toggleCode().run()} style={btnStyle(editor.isActive('code'))}>
            <Code size={15} />
          </button>
          <button type="button" title="Code Block" onClick={() => editor.chain().focus().toggleCodeBlock().run()} style={btnStyle(editor.isActive('codeBlock'))}>
            <FileCode size={15} />
          </button>
          <button type="button" title="Horizontal Rule" onClick={() => editor.chain().focus().setHorizontalRule().run()} style={btnStyle()}>
            <Minus size={15} />
          </button>
        </>
      )}

      <div style={dividerStyle} />

      {/* Links */}
      <button type="button" title="Insert Link" onClick={onOpenLinkModal} style={btnStyle(editor.isActive('link'))}>
        <LinkIcon size={15} />
      </button>
      {editor.isActive('link') && (
        <button type="button" title="Remove Link" onClick={() => editor.chain().focus().unsetLink().run()} style={btnStyle()}>
          <Unlink size={15} />
        </button>
      )}

      {/* Color Palettes for Full / Standard */}
      {!isCompact && (
        <>
          <div style={dividerStyle} />
          <select
            title="Text Color"
            onChange={(e) => {
              const val = e.target.value;
              if (val === 'inherit') editor.chain().focus().unsetColor().run();
              else editor.chain().focus().setColor(val).run();
            }}
            style={{ fontSize: '0.75rem', padding: '2px 4px', borderRadius: '4px', border: '1px solid var(--border-color, #cbd5e1)', background: 'transparent' }}
          >
            <option value="inherit">Text Color</option>
            {TEXT_COLORS.map(c => <option key={c.name} value={c.value}>{c.name}</option>)}
          </select>

          <select
            title="Highlight Color"
            onChange={(e) => {
              const val = e.target.value;
              if (val === 'transparent') editor.chain().focus().unsetHighlight().run();
              else editor.chain().focus().setHighlight({ color: val }).run();
            }}
            style={{ fontSize: '0.75rem', padding: '2px 4px', borderRadius: '4px', border: '1px solid var(--border-color, #cbd5e1)', background: 'transparent' }}
          >
            <option value="transparent">Highlight</option>
            {HIGHLIGHT_COLORS.map(c => <option key={c.name} value={c.value}>{c.name}</option>)}
          </select>
        </>
      )}

      {/* Alignments for Full */}
      {isFull && (
        <>
          <div style={dividerStyle} />
          <button type="button" title="Align Left" onClick={() => editor.chain().focus().setTextAlign('left').run()} style={btnStyle(editor.isActive({ textAlign: 'left' }))}>
            <AlignLeft size={15} />
          </button>
          <button type="button" title="Align Center" onClick={() => editor.chain().focus().setTextAlign('center').run()} style={btnStyle(editor.isActive({ textAlign: 'center' }))}>
            <AlignCenter size={15} />
          </button>
          <button type="button" title="Align Right" onClick={() => editor.chain().focus().setTextAlign('right').run()} style={btnStyle(editor.isActive({ textAlign: 'right' }))}>
            <AlignRight size={15} />
          </button>
          <button type="button" title="Justify" onClick={() => editor.chain().focus().setTextAlign('justify').run()} style={btnStyle(editor.isActive({ textAlign: 'justify' }))}>
            <AlignJustify size={15} />
          </button>
        </>
      )}

      {/* Table insert */}
      {!isCompact && (
        <button type="button" title="Insert Table" onClick={() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()} style={btnStyle(editor.isActive('table'))}>
          <TableIcon size={15} />
        </button>
      )}

      <div style={dividerStyle} />

      {/* Inline Image Picker */}
      <input type="file" ref={imageInputRef} accept="image/png, image/jpeg, image/jpg, image/webp, image/gif" onChange={handleImageFileChange} style={{ display: 'none' }} />
      <span title={!hasTargetId ? 'Save this item first to upload images or attachments.' : (uploading ? 'Uploading...' : 'Insert Image')} style={{ display: 'inline-flex' }}>
        <button
          type="button"
          onClick={() => {
            if (!hasTargetId) return;
            imageInputRef.current?.click();
          }}
          disabled={!hasTargetId || uploading}
          style={btnStyle(false, !hasTargetId || uploading)}
        >
          <ImageIcon size={15} />
        </button>
      </span>

      {/* Paperclip Attachment Picker */}
      <input type="file" ref={attachmentInputRef} onChange={handleAttachmentFileChange} style={{ display: 'none' }} />
      <span title={!hasTargetId ? 'Save this item first to upload images or attachments.' : (uploading ? 'Uploading...' : 'Attach File (Paperclip)')} style={{ display: 'inline-flex' }}>
        <button
          type="button"
          onClick={() => {
            if (!hasTargetId) return;
            attachmentInputRef.current?.click();
          }}
          disabled={!hasTargetId || uploading}
          style={btnStyle(false, !hasTargetId || uploading)}
        >
          <Paperclip size={15} />
        </button>
      </span>

      {/* Fullscreen Toggle */}
      {onToggleFullscreen && (
        <>
          <div style={dividerStyle} />
          <button type="button" title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"} onClick={onToggleFullscreen} style={btnStyle(isFullscreen)}>
            {isFullscreen ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
          </button>
        </>
      )}
    </div>
  );
}
