import DOMPurify from 'dompurify';

export function sanitizeRichTextHtml(htmlStr) {
  if (!htmlStr) return '';
  let s = String(htmlStr).trim();

  // Rule 12: Detect legacy escaped content, unescape ONCE, immediately sanitize.
  // Guard: document is unavailable during SSR — skip unescape on the server.
  if (typeof document !== 'undefined' && (s.includes('&lt;') || s.includes('&gt;'))) {
    const txt = document.createElement('textarea');
    txt.innerHTML = s;
    s = txt.value;
  }

  // Configure DOMPurify to allow Tiptap data attributes and safe inline styles
  return DOMPurify.sanitize(s, {
    ADD_TAGS: ['iframe', 'table', 'thead', 'tbody', 'tr', 'th', 'td', 'img'],
    ADD_ATTR: [
      'target', 'rel', 'data-type', 'data-checked',
      'data-attachment-id', 'data-inline-image-id', 'data-alignment',
      'src', 'alt', 'width', 'height',
      'colspan', 'rowspan', 'style', 'class'
    ],
    FORCE_BODY: false,
  });
}

export function isRichTextEmpty(htmlStr) {
  if (!htmlStr) return true;
  const sanitized = sanitizeRichTextHtml(htmlStr);
  const textOnly = sanitized.replace(/<[^>]*>/g, '').trim();
  return textOnly.length === 0;
}

export function richTextToPlainText(htmlStr, maxLength = null) {
  if (!htmlStr) return '';
  const sanitized = sanitizeRichTextHtml(htmlStr);
  let text = sanitized.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  if (maxLength && text.length > maxLength) {
    return text.substring(0, maxLength) + '...';
  }
  return text;
}
