'use client';

import React, { useState, useEffect } from 'react';
import { apiFetch } from '../../lib/api/apiClient';

// In-memory reference-counted blob URL cache for the active session
// Prevents duplicate fetches between chat thumbnails, lightbox, and re-renders
const blobCache = new Map(); // url -> { blobUrl, refCount }

export function useAuthenticatedBlob(url) {
  const [blobUrl, setBlobUrl] = useState(() => (url && blobCache.has(url) ? blobCache.get(url).blobUrl : null));
  const [loading, setLoading] = useState(() => Boolean(url && !blobCache.has(url)));
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!url) {
      setBlobUrl(null);
      setLoading(false);
      setError(false);
      return;
    }

    let isMounted = true;

    if (blobCache.has(url)) {
      const entry = blobCache.get(url);
      entry.refCount += 1;
      setBlobUrl(entry.blobUrl);
      setLoading(false);
      setError(false);

      return () => {
        isMounted = false;
        const currentEntry = blobCache.get(url);
        if (currentEntry) {
          currentEntry.refCount -= 1;
          if (currentEntry.refCount <= 0) {
            try {
              URL.revokeObjectURL(currentEntry.blobUrl);
            } catch (e) {}
            blobCache.delete(url);
          }
        }
      };
    }

    setLoading(true);
    setError(false);

    apiFetch(url, { responseType: 'blob' })
      .then((blob) => {
        if (!isMounted) return;
        const objectUrl = URL.createObjectURL(blob);
        blobCache.set(url, { blobUrl: objectUrl, refCount: 1 });
        setBlobUrl(objectUrl);
        setLoading(false);
      })
      .catch((err) => {
        if (!isMounted) return;
        console.error('Authenticated media fetch failed:', err);
        setError(true);
        setLoading(false);
      });

    return () => {
      isMounted = false;
      const entry = blobCache.get(url);
      if (entry) {
        entry.refCount -= 1;
        if (entry.refCount <= 0) {
          try {
            URL.revokeObjectURL(entry.blobUrl);
          } catch (e) {}
          blobCache.delete(url);
        }
      }
    };
  }, [url]);

  return { blobUrl, loading, error };
}

export default function AuthenticatedMediaPreview({
  type = 'image',
  url,
  alt = 'Media attachment',
  mimeType,
  onClick,
  isLightbox = false,
}) {
  const { blobUrl, loading, error } = useAuthenticatedBlob(url);

  if (loading) {
    if (isLightbox) {
      return (
        <div style={{ padding: 40, color: '#94a3b8', fontSize: 13, textAlign: 'center' }}>
          Loading image...
        </div>
      );
    }
    return (
      <div
        style={{
          height: type === 'video' ? 140 : 160,
          borderRadius: 6,
          background: '#0f172a',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#94a3b8',
          fontSize: 12,
          marginBottom: 6,
        }}
      >
        <span>Loading {type === 'video' ? 'video' : 'image'}...</span>
      </div>
    );
  }

  if (error || !blobUrl) {
    if (isLightbox) {
      return (
        <div style={{ padding: 40, color: '#f87171', fontSize: 13, textAlign: 'center' }}>
          Unable to load media
        </div>
      );
    }
    return (
      <div
        style={{
          height: 50,
          borderRadius: 6,
          background: '#fef2f2',
          border: '1px solid #fecaca',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#991b1b',
          fontSize: 12,
          marginBottom: 6,
        }}
      >
        <span>Unable to load media</span>
      </div>
    );
  }

  if (type === 'video') {
    return (
      <div style={{ borderRadius: 6, overflow: 'hidden', background: '#000', marginBottom: 6 }}>
        <video
          controls
          preload="metadata"
          style={{ width: '100%', maxHeight: 240, display: 'block' }}
        >
          <source src={blobUrl} type={mimeType || (alt?.toLowerCase().endsWith('.webm') ? 'video/webm' : 'video/mp4')} />
          Your browser does not support the video tag.
        </video>
      </div>
    );
  }

  if (isLightbox) {
    return (
      /* eslint-disable-next-line @next/next/no-img-element */
      <img
        src={blobUrl}
        alt={alt}
        style={{ maxWidth: '85vw', maxHeight: '70vh', objectFit: 'contain', borderRadius: 6 }}
      />
    );
  }

  return (
    <div
      onClick={onClick}
      style={{
        height: 160,
        borderRadius: 6,
        overflow: 'hidden',
        cursor: onClick ? 'pointer' : 'default',
        background: '#000',
        position: 'relative',
        marginBottom: 6,
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={blobUrl} alt={alt} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
      {onClick && (
        <div
          style={{
            position: 'absolute',
            bottom: 4,
            right: 4,
            background: 'rgba(15,23,42,0.8)',
            color: '#fff',
            padding: '2px 6px',
            borderRadius: 4,
            fontSize: 10,
            fontWeight: 700,
            backdropFilter: 'blur(4px)',
          }}
        >
          Click to expand
        </div>
      )}
    </div>
  );
}

export async function downloadAuthenticatedFile(url, fileName) {
  try {
    const blob = await apiFetch(url, { responseType: 'blob' });
    const blobUrl = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = blobUrl;
    a.download = fileName || 'download';
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      try {
        URL.revokeObjectURL(blobUrl);
      } catch (e) {}
      if (a.parentNode) a.parentNode.removeChild(a);
    }, 1000);
  } catch (err) {
    console.error('Download error:', err);
    alert('Failed to download file.');
  }
}

export async function viewAuthenticatedPdf(url) {
  try {
    const blob = await apiFetch(url, { responseType: 'blob' });
    const pdfBlob = new Blob([blob], { type: 'application/pdf' });
    const blobUrl = URL.createObjectURL(pdfBlob);
    window.open(blobUrl, '_blank');
  } catch (err) {
    console.error('PDF view error:', err);
    alert('Failed to open PDF.');
  }
}
