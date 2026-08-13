'use client';

import React, { useState, useEffect } from 'react';

export default function RichTextLinkModal({ isOpen, initialUrl = '', initialText = '', onSave, onClose }) {
  const [url, setUrl] = useState(initialUrl);
  const [text, setText] = useState(initialText);
  const [error, setError] = useState('');

  useEffect(() => {
    setUrl(initialUrl);
    setText(initialText);
    setError('');
  }, [initialUrl, initialText, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');
    let trimmed = url.trim();
    if (!trimmed) {
      setError('Please enter a valid URL.');
      return;
    }
    if (/^(javascript|vbscript|file):/i.test(trimmed)) {
      setError('Invalid or unsafe link protocol.');
      return;
    }
    if (!trimmed.startsWith('/') && !trimmed.startsWith('mailto:') && !/^(https?:\/\/)/i.test(trimmed)) {
      trimmed = `https://${trimmed}`;
    }

    onSave({ url: trimmed, text: text.trim() });
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      backgroundColor: 'rgba(15, 23, 42, 0.65)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px'
    }}>
      <div style={{
        background: 'var(--bg-card, #ffffff)',
        color: 'var(--text-primary, #0f172a)',
        borderRadius: '12px', padding: '20px 24px', width: '100%', maxWidth: '420px',
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
        border: '1px solid var(--border-color, #e2e8f0)'
      }}>
        <h3 style={{ margin: '0 0 16px', fontSize: '1.1rem', fontWeight: 600 }}>Insert / Edit Link</h3>
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '12px' }}>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 500, marginBottom: '4px' }}>
              URL / Link Destination
            </label>
            <input
              type="text"
              placeholder="https://example.com"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              style={{
                width: '100%', padding: '8px 12px', borderRadius: '6px',
                border: '1px solid var(--border-color, #cbd5e1)',
                background: 'var(--bg-input, #f8fafc)', color: 'var(--text-primary, #0f172a)'
              }}
              autoFocus
            />
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 500, marginBottom: '4px' }}>
              Display Text (Optional)
            </label>
            <input
              type="text"
              placeholder="Link Text"
              value={text}
              onChange={(e) => setText(e.target.value)}
              style={{
                width: '100%', padding: '8px 12px', borderRadius: '6px',
                border: '1px solid var(--border-color, #cbd5e1)',
                background: 'var(--bg-input, #f8fafc)', color: 'var(--text-primary, #0f172a)'
              }}
            />
          </div>

          {error && (
            <div style={{ color: '#ef4444', fontSize: '0.85rem', marginBottom: '12px' }}>
              {error}
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: '8px 16px', borderRadius: '6px', border: '1px solid var(--border-color, #cbd5e1)',
                background: 'transparent', color: 'var(--text-primary, #0f172a)', cursor: 'pointer'
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              style={{
                padding: '8px 16px', borderRadius: '6px', border: 'none',
                background: '#2563eb', color: '#ffffff', fontWeight: 500, cursor: 'pointer'
              }}
            >
              Save Link
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
