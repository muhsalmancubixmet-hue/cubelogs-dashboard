'use client';

import React from 'react';

export default function RichTextTableMenu({ editor }) {
  if (!editor || !editor.isActive('table')) {
    return null;
  }

  const btnStyle = {
    padding: '4px 8px',
    fontSize: '0.75rem',
    borderRadius: '4px',
    border: '1px solid var(--border-color, #cbd5e1)',
    background: 'var(--bg-card, #ffffff)',
    color: 'var(--text-primary, #0f172a)',
    cursor: 'pointer',
  };

  return (
    <div style={{
      display: 'flex', flexWrap: 'wrap', gap: '4px', padding: '6px',
      background: 'var(--bg-card, #ffffff)', border: '1px solid var(--border-color, #cbd5e1)',
      borderRadius: '6px', marginBottom: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
    }}>
      <button type="button" onClick={() => editor.chain().focus().addColumnBefore().run()} style={btnStyle}>+ Col Left</button>
      <button type="button" onClick={() => editor.chain().focus().addColumnAfter().run()} style={btnStyle}>+ Col Right</button>
      <button type="button" onClick={() => editor.chain().focus().deleteColumn().run()} style={{ ...btnStyle, color: '#ef4444' }}>- Delete Col</button>
      <button type="button" onClick={() => editor.chain().focus().addRowBefore().run()} style={btnStyle}>+ Row Above</button>
      <button type="button" onClick={() => editor.chain().focus().addRowAfter().run()} style={btnStyle}>+ Row Below</button>
      <button type="button" onClick={() => editor.chain().focus().deleteRow().run()} style={{ ...btnStyle, color: '#ef4444' }}>- Delete Row</button>
      <button type="button" onClick={() => editor.chain().focus().toggleHeaderCell().run()} style={btnStyle}>Toggle Header</button>
      <button type="button" onClick={() => editor.chain().focus().deleteTable().run()} style={{ ...btnStyle, background: '#ef4444', color: '#ffffff' }}>Delete Table</button>
    </div>
  );
}
