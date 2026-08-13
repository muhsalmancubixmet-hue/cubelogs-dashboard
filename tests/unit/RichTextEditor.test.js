import React from 'react';
import { render } from '@testing-library/react';
import {
  TiptapReadOnly,
  sanitizeRichTextHtml,
  isRichTextEmpty,
  richTextToPlainText,
  normalizeMediaUrl
} from '../../components/rich-text';

describe('Tiptap Migration & Canonical Renderer Tests', () => {
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
  });
});
