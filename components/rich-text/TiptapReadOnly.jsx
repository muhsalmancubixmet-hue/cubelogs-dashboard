'use client';

import React, { useState, useEffect, useRef } from 'react';
import { sanitizeRichTextHtml } from './richTextSanitizer';
import { normalizeMediaUrl } from './richTextMedia';
import { FileText, List, ChevronUp, ChevronDown, Image as ImageIcon, Maximize2, ChevronLeft, ChevronRight, X } from 'lucide-react';

export default function TiptapReadOnly({ content = '', className = '', enableToc = true }) {
  const [mounted, setMounted] = useState(false);
  const [previewIndex, setPreviewIndex] = useState(null);
  const [allImages, setAllImages] = useState([]);
  const [headings, setHeadings] = useState([]);
  const [showToc, setShowToc] = useState(true);
  const containerRef = useRef(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Fulfills Rule 12 & Rule 11: Decodes legacy escaped HTML once, sanitizes with DOMPurify
  const sanitizedHtml = sanitizeRichTextHtml(content || '');

  // Safely normalize existing stored HTML containing src="/data:image..." to src="data:image..."
  let processedHtml = sanitizedHtml.replace(
    /src=["']\/data:image/gi,
    'src="data:image'
  );

  // Normalize media URLs in <img> tags and <a> tags for relative paths
  processedHtml = processedHtml.replace(
    /src=["'](\/media\/[^"']+)["']/g,
    (match, p1) => `src="${normalizeMediaUrl(p1)}"`
  );

  processedHtml = processedHtml.replace(
    /href=["'](\/media\/[^"']+)["']/g,
    (match, p1) => `href="${normalizeMediaUrl(p1)}"`
  );

  // Group 2 or more consecutive image paragraphs into a sleek photo album deck
  processedHtml = processedHtml.replace(
    (/(?:<p[^>]*>\s*(?:<br\s*\/?>)*\s*<img[^>]+>\s*(?:<br\s*\/?>)*\s*<\/p>\s*){2,}/gi),
    (match) => {
      const imgs = match.match(/<img[^>]+>/gi) || [];
      return `<div class="rich-text-media-gallery">${imgs.join('')}</div>`;
    }
  );

  // Group multiple images inside the same paragraph into the photo album deck
  processedHtml = processedHtml.replace(
    /<p[^>]*>(\s*<img[^>]+>(?:\s*<img[^>]+>)+)\s*<\/p>/gi,
    (match, innerImgs) => {
      return `<div class="rich-text-media-gallery">${innerImgs}</div>`;
    }
  );

  useEffect(() => {
    if (typeof document !== 'undefined' && mounted && containerRef.current) {
      // Extract all image URLs for Lightbox
      const imgEls = Array.from(containerRef.current.querySelectorAll('img')).map(img => img.getAttribute('src')).filter(Boolean);
      setAllImages(imgEls);

      // Extract all headings for Table of Contents
      if (enableToc) {
        const headingEls = Array.from(containerRef.current.querySelectorAll('h1, h2, h3'));
        const extracted = headingEls.map((el, index) => {
          if (!el.id) el.id = `toc-heading-${index}`;
          const level = parseInt(el.tagName.replace('H', ''), 10);
          return {
            id: el.id,
            text: el.textContent.trim(),
            level,
          };
        }).filter(h => h.text.length > 0);
        setHeadings(extracted);
      }
    }
  }, [processedHtml, mounted, enableToc]);

  useEffect(() => {
    if (previewIndex === null) return;

    const handleKeyDown = (e) => {
      if (e.key === 'ArrowRight') {
        if (previewIndex < allImages.length - 1) setPreviewIndex(prev => prev + 1);
      } else if (e.key === 'ArrowLeft') {
        if (previewIndex > 0) setPreviewIndex(prev => prev - 1);
      } else if (e.key === 'Escape') {
        setPreviewIndex(null);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [previewIndex, allImages]);

  if (!content) return null;

  if (!mounted) {
    return <div className={`tiptap-readonly-ssr ${className}`}>{content.replace(/<[^>]*>/g, '')}</div>;
  }

  const handleContainerClick = (e) => {
    if (e.target && e.target.tagName === 'IMG') {
      const src = e.target.getAttribute('src');
      if (src) {
        const idx = allImages.indexOf(src);
        setPreviewIndex(idx >= 0 ? idx : 0);
      }
    }
  };

  const scrollToHeading = (id) => {
    const target = document.getElementById(id);
    if (target) {
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const handlePrev = (e) => {
    e.stopPropagation();
    if (previewIndex !== null && previewIndex > 0) {
      setPreviewIndex(previewIndex - 1);
    }
  };

  const handleNext = (e) => {
    e.stopPropagation();
    if (previewIndex !== null && previewIndex < allImages.length - 1) {
      setPreviewIndex(previewIndex + 1);
    }
  };

  return (
    <>
      {/* Automated Table of Contents Widget */}
      {enableToc && headings.length >= 2 && (
        <div style={{
          margin: '0 0 18px',
          padding: '12px 16px',
          background: '#f8fafc',
          border: '1px solid #e2e8f0',
          borderRadius: 12,
          boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: showToc ? 10 : 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <List size={16} color="#2563eb" />
              <span style={{ fontSize: 13, fontWeight: 800, color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Table of Contents ({headings.length} sections)
              </span>
            </div>
            <button
              type="button"
              onClick={() => setShowToc(!showToc)}
              style={{
                fontSize: 12,
                fontWeight: 700,
                color: '#2563eb',
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4
              }}
            >
              <span>{showToc ? 'Hide' : 'Show'}</span>
              {showToc ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>
          </div>

          {showToc && (
            <nav style={{ display: 'flex', flexDirection: 'column', gap: 6, paddingTop: 6, borderTop: '1px solid #f1f5f9' }}>
              {headings.map((h) => (
                <a
                  key={h.id}
                  href={`#${h.id}`}
                  onClick={(e) => {
                    e.preventDefault();
                    scrollToHeading(h.id);
                  }}
                  style={{
                    fontSize: h.level === 1 ? '13px' : (h.level === 2 ? '12.5px' : '12px'),
                    fontWeight: h.level === 1 ? 700 : (h.level === 2 ? 600 : 500),
                    color: '#2563eb',
                    paddingLeft: `${(h.level - 1) * 14}px`,
                    textDecoration: 'none',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    transition: 'color 0.15s ease'
                  }}
                >
                  <span style={{ opacity: 0.5, fontSize: 10 }}>●</span>
                  <span>{h.text}</span>
                </a>
              ))}
            </nav>
          )}
        </div>
      )}

      <div style={{
        background: 'linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)',
        border: '1px solid #e2e8f0',
        borderRadius: 12,
        padding: '14px 18px',
        position: 'relative',
        boxShadow: '0 2px 10px -2px rgba(15, 23, 42, 0.04)',
        overflow: 'hidden'
      }}>
        {/* Top Accent Gradient Bar */}
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: 3,
          background: 'linear-gradient(90deg, #3b82f6 0%, #6366f1 50%, #a855f7 100%)'
        }} />

        <div
          ref={containerRef}
          className={`tiptap-readonly ${className}`}
          onClick={handleContainerClick}
          dangerouslySetInnerHTML={{ __html: processedHtml }}
          style={{
            lineHeight: 1.55,
            color: 'var(--text-primary, #0f172a)',
            fontSize: '0.9rem',
            wordBreak: 'break-word',
          }}
        />

        {/* Footer info strip if images or attachments exist */}
        {allImages.length > 0 && (
          <div style={{
            marginTop: 10,
            paddingTop: 8,
            borderTop: '1px solid #f1f5f9',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: 10,
            fontWeight: 600,
            color: '#64748b'
          }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
              <ImageIcon size={13} color="#64748b" />
              <span>{allImages.length} Embedded Media Asset{allImages.length > 1 ? 's' : ''}</span>
            </span>
            <span style={{ color: '#2563eb', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              <Maximize2 size={12} color="#2563eb" />
              <span>Click any image to open full lightbox</span>
            </span>
          </div>
        )}
      </div>

      {previewIndex !== null && allImages[previewIndex] && (
        <div
          onClick={() => setPreviewIndex(null)}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 99999,
            background: 'rgba(15, 23, 42, 0.88)',
            backdropFilter: 'blur(6px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 24,
            cursor: 'zoom-out'
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{ position: 'relative', maxWidth: '90vw', maxHeight: '88vh', display: 'flex', flexDirection: 'column', alignItems: 'center' }}
          >
            <img
              src={allImages[previewIndex]}
              alt={`Gallery Preview ${previewIndex + 1}`}
              style={{
                maxWidth: '90vw',
                maxHeight: '80vh',
                objectFit: 'contain',
                borderRadius: 12,
                boxShadow: '0 20px 50px rgba(0,0,0,0.6)',
                border: '1px solid rgba(255,255,255,0.2)'
              }}
            />

            {/* Gallery Navigation Controls */}
            {allImages.length > 1 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginTop: 14 }}>
                <button
                  type="button"
                  onClick={handlePrev}
                  disabled={previewIndex === 0}
                  style={{
                    background: previewIndex === 0 ? 'rgba(255,255,255,0.2)' : '#ffffff',
                    color: previewIndex === 0 ? '#cbd5e1' : '#0f172a',
                    border: 'none',
                    borderRadius: '50%',
                    width: 38,
                    height: 38,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 800,
                    cursor: previewIndex === 0 ? 'not-allowed' : 'pointer',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.3)'
                  }}
                >
                  <ChevronLeft size={20} />
                </button>

                <span style={{ color: '#ffffff', fontSize: 13, fontWeight: 700, background: 'rgba(255,255,255,0.15)', padding: '4px 12px', borderRadius: 12 }}>
                  {previewIndex + 1} of {allImages.length}
                </span>

                <button
                  type="button"
                  onClick={handleNext}
                  disabled={previewIndex === allImages.length - 1}
                  style={{
                    background: previewIndex === allImages.length - 1 ? 'rgba(255,255,255,0.2)' : '#ffffff',
                    color: previewIndex === allImages.length - 1 ? '#cbd5e1' : '#0f172a',
                    border: 'none',
                    borderRadius: '50%',
                    width: 38,
                    height: 38,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 800,
                    cursor: previewIndex === allImages.length - 1 ? 'not-allowed' : 'pointer',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.3)'
                  }}
                >
                  <ChevronRight size={20} />
                </button>
              </div>
            )}

            <button
              type="button"
              onClick={() => setPreviewIndex(null)}
              style={{
                position: 'absolute',
                top: -14,
                right: -14,
                background: '#ffffff',
                color: '#0f172a',
                border: 'none',
                borderRadius: '50%',
                width: 34,
                height: 34,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 800,
                boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
                cursor: 'pointer'
              }}
            >
              <X size={18} />
            </button>
          </div>
        </div>
      )}
    </>
  );
}
