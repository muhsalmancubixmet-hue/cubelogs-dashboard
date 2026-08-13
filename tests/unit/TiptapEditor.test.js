import React from 'react';
import { render } from '@testing-library/react';
import {
  TiptapReadOnly,
  sanitizeRichTextHtml,
  isRichTextEmpty,
  richTextToPlainText,
  normalizeMediaUrl
} from '../../components/rich-text';

describe('Tiptap System & Helper Functions', () => {
  describe('HTML Sanitizer & Excerpt Helpers', () => {
    it('sanitizes unsafe script and iframe tags', () => {
      const unsafe = '<p>Hello</p><script>alert("xss")</script><iframe src="evil.com"></iframe>';
      const clean = sanitizeRichTextHtml(unsafe);

      expect(clean).toContain('<p>Hello</p>');
      expect(clean).not.toContain('<script>');
      expect(clean).not.toContain('alert');
    });

    it('unescapes legacy double-escaped HTML content once before sanitizing', () => {
      const legacyEscaped = '&lt;p&gt;&lt;strong&gt;Clean Text&lt;/strong&gt;&lt;/p&gt;';
      const clean = sanitizeRichTextHtml(legacyEscaped);

      expect(clean).toContain('<strong>Clean Text</strong>');
      expect(clean).not.toContain('&lt;p&gt;');
    });

    it('correctly detects empty rich text wrappers', () => {
      expect(isRichTextEmpty('')).toBe(true);
      expect(isRichTextEmpty('<p></p>')).toBe(true);
      expect(isRichTextEmpty('<p><br></p>')).toBe(true);
      expect(isRichTextEmpty('<p>   </p>')).toBe(true);
      expect(isRichTextEmpty('<p>Real Content</p>')).toBe(false);
    });

    it('converts rich text HTML to plain text excerpt', () => {
      const html = '<h1>Title</h1><p>This is a <strong>long description</strong> for a project.</p>';
      const excerpt = richTextToPlainText(html, 20);

      expect(excerpt).toBe('Title This is a long...');
    });

    it('normalizes relative media URLs to backend origin', () => {
      const rel = '/media/project_attachments/2026/08/file.png';
      const norm = normalizeMediaUrl(rel);

      expect(norm).toContain('/media/project_attachments/2026/08/file.png');
      expect(norm.startsWith('http://') || norm.startsWith('https://')).toBe(true);
    });

    it('returns data:, blob:, http://, and https:// URLs unchanged', () => {
      const dataUrl = 'data:image/jpeg;base64,/9j/4AAQSkZJRg...';
      const blobUrl = 'blob:http://localhost:3000/123-456';
      const httpUrl = 'http://example.com/test.jpg';
      const httpsUrl = 'https://example.com/test.jpg';

      expect(normalizeMediaUrl(dataUrl)).toBe(dataUrl);
      expect(normalizeMediaUrl(blobUrl)).toBe(blobUrl);
      expect(normalizeMediaUrl(httpUrl)).toBe(httpUrl);
      expect(normalizeMediaUrl(httpsUrl)).toBe(httpsUrl);
    });

    it('strips leading slash from malformed /data: URLs', () => {
      const malformed = '/data:image/png;base64,iVBORw0KGgo...';
      expect(normalizeMediaUrl(malformed)).toBe('data:image/png;base64,iVBORw0KGgo...');
    });
  });

  describe('TiptapReadOnly Viewer', () => {
    it('renders empty content cleanly without crashing', () => {
      const { container } = render(<TiptapReadOnly content="" />);
      expect(container.firstChild).toBeNull();
    });

    it('renders HTML content without showing raw HTML tags', () => {
      const html = '<h1>Heading 1</h1><p>Paragraph with <a href="https://example.com">link</a></p>';
      const { container } = render(<TiptapReadOnly content={html} />);

      expect(container.querySelector('h1')).not.toBeNull();
      expect(container.querySelector('h1').textContent).toBe('Heading 1');
      expect(container.querySelector('a')).not.toBeNull();
      expect(container.textContent).not.toContain('<h1>');
      expect(container.textContent).not.toContain('<p>');
    });

    it('normalizes src="/data:image..." stored HTML safely to src="data:image..."', () => {
      const storedHtml = '<p><img src="/data:image/jpeg;base64,/9j/4AAQ" alt="stored" /></p>';
      const { container } = render(<TiptapReadOnly content={storedHtml} />);
      const img = container.querySelector('img');

      expect(img).not.toBeNull();
      expect(img.getAttribute('src')).toBe('data:image/jpeg;base64,/9j/4AAQ');
    });
  });
});
