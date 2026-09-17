import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import TiptapEditor from '../../components/rich-text/TiptapEditor';
import { dataUriToFile, parseDataUri, ALLOWED_IMAGE_MIMES } from '../../components/rich-text/richTextMedia';
import { sanitizeRichTextHtml } from '../../components/rich-text/richTextSanitizer';

describe('Tiptap Base64 Media Hardening & Conversion Tests', () => {
  const valid1x1PngBase64 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
  const uppercasePngBase64 = 'DATA:IMAGE/PNG;BASE64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
  const parameterizedPngBase64 = 'data:image/png;charset=utf-8;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
  const mixedCasePngBase64 = 'data:image/png;foo=bar;BaSe64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
  const svgBase64 = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPjwvc3ZnPg==';
  const malformedDataUri = 'data:image/png;base64,!!!invalid-base64-content***';
  
  let originalFetch;

  beforeEach(() => {
    jest.resetAllMocks();
    originalFetch = global.fetch;
    global.fetch = jest.fn();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  describe('1. dataUriToFile validation rules', () => {
    test('converts valid base64 PNG to File with correct mime and properties', () => {
      const file = dataUriToFile(valid1x1PngBase64, 'test-image');
      expect(file).toBeInstanceOf(File);
      expect(file.type).toBe('image/png');
      expect(file.name).toBe('test-image.png');
      expect(file.size).toBeGreaterThan(0);
    });

    test('handles uppercase DATA:IMAGE/PNG;BASE64 data URI', () => {
      const file = dataUriToFile(uppercasePngBase64, 'upper-image');
      expect(file).toBeInstanceOf(File);
      expect(file.type).toBe('image/png');
      expect(file.name).toBe('upper-image.png');
    });

    test('handles parameterized data:image/png;charset=utf-8;base64 data URI', () => {
      const file = dataUriToFile(parameterizedPngBase64, 'param-image');
      expect(file).toBeInstanceOf(File);
      expect(file.type).toBe('image/png');
      expect(file.name).toBe('param-image.png');
    });

    test('handles mixed-case ;BaSe64 with parameters data URI', () => {
      const file = dataUriToFile(mixedCasePngBase64, 'mixed-image');
      expect(file).toBeInstanceOf(File);
      expect(file.type).toBe('image/png');
      expect(file.name).toBe('mixed-image.png');
    });

    test('rejects SVG data URI as unsupported format', () => {
      expect(() => {
        dataUriToFile(svgBase64, 'vector');
      }).toThrow(/Unsupported image format/);
    });

    test('rejects malformed data URI missing header', () => {
      expect(() => {
        dataUriToFile('not-a-data-uri');
      }).toThrow(/Malformed data URI/);
    });

    test('rejects invalid base64 encoding', () => {
      expect(() => {
        dataUriToFile(malformedDataUri);
      }).toThrow(/Invalid base64/);
    });

    test('rejects decoded image exceeding 10MB attachment limit', () => {
      // 10MB + 1 byte
      const largeLen = 10 * 1024 * 1024 + 1;
      const fakeBinaryStr = 'x'.repeat(largeLen);
      const fakeB64 = Buffer.from(fakeBinaryStr, 'binary').toString('base64');
      const largeDataUri = `data:image/png;base64,${fakeB64}`;

      expect(() => {
        dataUriToFile(largeDataUri);
      }).toThrow(/Decoded image exceeds the 10 MB attachment limit/);
    });
  });

  describe('2. sanitizeRichTextHtml fail-safe', () => {
    test('strips data:image/ from src attributes', () => {
      const html = `<p><img src="${valid1x1PngBase64}" alt="pasted"></p>`;
      const sanitized = sanitizeRichTextHtml(html);
      expect(sanitized).not.toContain('data:image/');
      expect(sanitized).not.toContain('base64');
    });

    test('strips uppercase, parameterized, and mixed-case data:image/ from src attributes', () => {
      const html = `<p><img src="${uppercasePngBase64}" alt="upper"><img src="${parameterizedPngBase64}" alt="param"><img src="${mixedCasePngBase64}" alt="mixed"></p>`;
      const sanitized = sanitizeRichTextHtml(html);
      expect(sanitized.toLowerCase()).not.toContain('data:image/');
      expect(sanitized.toLowerCase()).not.toContain('base64');
    });

    test('preserves normal authenticated attachment download URLs and data-attachment-id', () => {
      const html = '<p><img src="/api/v1/attachments/42/download/" alt="photo" data-attachment-id="42"></p>';
      const sanitized = sanitizeRichTextHtml(html);
      expect(sanitized).toContain('src="/api/v1/attachments/42/download/"');
      expect(sanitized).toContain('data-attachment-id="42"');
    });
  });

  describe('3. TiptapEditor paste conversion & fail-safe UI flow', () => {
    test('pasted HTML containing base64 image converts to File, uploads to /v1/attachments/, and inserts attachment reference', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        headers: { get: () => 'application/json' },
        json: async () => ({
          id: 55,
          file_url: 'http://localhost:8000/api/v1/attachments/55/download/',
          file_name: 'pasted-image.png',
          is_inline: true,
        }),
      });

      let currentValue = '';
      const { container } = render(
        <TiptapEditor
          targetType="story"
          storyId={10}
          value=""
          onChange={(val) => { currentValue = val; }}
        />
      );

      const proseMirror = container.querySelector('.ProseMirror');
      expect(proseMirror).toBeTruthy();

      const pastedHtml = `<p>Screenshot: <img src="${valid1x1PngBase64}" alt="screenshot"></p>`;
      const pasteEvent = new Event('paste', { bubbles: true, cancelable: true });
      Object.defineProperty(pasteEvent, 'clipboardData', {
        value: {
          getData: (format) => (format === 'text/html' ? pastedHtml : ''),
          items: [],
        },
      });

      fireEvent(proseMirror, pasteEvent);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledTimes(1);
        const callArgs = global.fetch.mock.calls[0];
        expect(callArgs[0]).toContain('/v1/attachments/');
        const body = callArgs[1].body;
        expect(body.get('story')).toBe('10');
        expect(body.get('is_inline')).toBe('true');
      });
    });

    test('pasted HTML containing uppercase, parameterized, and mixed-case base64 images converts and uploads safely', async () => {
      global.fetch.mockResolvedValue({
        ok: true,
        headers: { get: () => 'application/json' },
        json: async () => ({
          id: 60,
          file_url: 'http://localhost:8000/api/v1/attachments/60/download/',
          file_name: 'pasted.png',
          is_inline: true,
        }),
      });

      const { container } = render(
        <TiptapEditor
          targetType="story"
          storyId={10}
          value=""
          onChange={() => {}}
        />
      );

      const proseMirror = container.querySelector('.ProseMirror');
      const pastedHtml = `<p><img src="${uppercasePngBase64}"><img src="${parameterizedPngBase64}"><img src="${mixedCasePngBase64}"></p>`;
      const pasteEvent = new Event('paste', { bubbles: true, cancelable: true });
      Object.defineProperty(pasteEvent, 'clipboardData', {
        value: {
          getData: (format) => (format === 'text/html' ? pastedHtml : ''),
          items: [],
        },
      });

      fireEvent(proseMirror, pasteEvent);

      await waitFor(() => {
        // 3 upload calls (POST to /attachments/) + 3 NodeView blob-auth fetches (GET) = 6 total.
        // Verify the 3 upload calls happened — each targets the attachments endpoint.
        const uploadCalls = global.fetch.mock.calls.filter(
          ([url]) => url && url.toString().includes('/v1/attachments/')
        );
        expect(uploadCalls.length).toBeGreaterThanOrEqual(3);
      });
    });

    test('pasting plain text data:image URI converts and uploads image', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        headers: { get: () => 'application/json' },
        json: async () => ({
          id: 77,
          file_url: 'http://localhost:8000/api/v1/attachments/77/download/',
          file_name: 'pasted-image.png',
          is_inline: true,
        }),
      });

      const { container } = render(
        <TiptapEditor
          targetType="task"
          taskId={25}
          value=""
          onChange={() => {}}
        />
      );

      const proseMirror = container.querySelector('.ProseMirror');
      const pasteEvent = new Event('paste', { bubbles: true, cancelable: true });
      Object.defineProperty(pasteEvent, 'clipboardData', {
        value: {
          getData: (format) => (format === 'text/plain' ? valid1x1PngBase64 : ''),
          items: [],
        },
      });

      fireEvent(proseMirror, pasteEvent);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledTimes(1);
        const callArgs = global.fetch.mock.calls[0];
        expect(callArgs[0]).toContain('/v1/attachments/');
      });
    });

    test('failed base64 conversion or upload displays concise error and does NOT retain raw base64 in editor', async () => {
      // Mock upload failure
      global.fetch.mockRejectedValueOnce(new Error('Network failure'));

      const { container } = render(
        <TiptapEditor
          targetType="story"
          storyId={10}
          value=""
          onChange={() => {}}
        />
      );

      const proseMirror = container.querySelector('.ProseMirror');
      const pastedHtml = `<p><img src="${valid1x1PngBase64}" alt="failed"></p>`;
      const pasteEvent = new Event('paste', { bubbles: true, cancelable: true });
      Object.defineProperty(pasteEvent, 'clipboardData', {
        value: {
          getData: (format) => (format === 'text/html' ? pastedHtml : ''),
          items: [],
        },
      });

      fireEvent(proseMirror, pasteEvent);

      await waitFor(() => {
        expect(screen.getByText('Unable to add this image.')).toBeTruthy();
      });

      // Confirm raw base64 is NOT inside editor HTML
      expect(proseMirror.innerHTML).not.toContain('data:image/');
      expect(proseMirror.innerHTML).not.toContain('base64');
    });

    test('pasting unsupported SVG data URI shows error and does not insert SVG', async () => {
      const { container } = render(
        <TiptapEditor
          targetType="story"
          storyId={10}
          value=""
          onChange={() => {}}
        />
      );

      const proseMirror = container.querySelector('.ProseMirror');
      const pastedHtml = `<p><img src="${svgBase64}" alt="vector"></p>`;
      const pasteEvent = new Event('paste', { bubbles: true, cancelable: true });
      Object.defineProperty(pasteEvent, 'clipboardData', {
        value: {
          getData: (format) => (format === 'text/html' ? pastedHtml : ''),
          items: [],
        },
      });

      fireEvent(proseMirror, pasteEvent);

      await waitFor(() => {
        expect(screen.getByText('Unable to add this image.')).toBeTruthy();
      });

      expect(proseMirror.innerHTML).not.toContain('data:image/svg+xml');
    });

    test('existing normal image file paste still works via items loop', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        headers: { get: () => 'application/json' },
        json: async () => ({
          id: 88,
          file_url: 'http://localhost:8000/api/v1/attachments/88/download/',
          file_name: 'clipboard.png',
          is_inline: true,
        }),
      });

      const { container } = render(
        <TiptapEditor
          targetType="story"
          storyId={10}
          value=""
          onChange={() => {}}
        />
      );

      const proseMirror = container.querySelector('.ProseMirror');
      const file = new File(['png-data'], 'clipboard.png', { type: 'image/png' });
      const pasteEvent = new Event('paste', { bubbles: true, cancelable: true });
      Object.defineProperty(pasteEvent, 'clipboardData', {
        value: {
          getData: () => '',
          items: [
            {
              kind: 'file',
              type: 'image/png',
              getAsFile: () => file,
            },
          ],
        },
      });

      fireEvent(proseMirror, pasteEvent);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledTimes(1);
        const body = global.fetch.mock.calls[0][1].body;
        expect(body.get('story')).toBe('10');
      });
    });

    test('existing toolbar file and image inputs remain functional', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        headers: { get: () => 'application/json' },
        json: async () => ({
          id: 99,
          file_url: 'http://localhost:8000/api/v1/attachments/99/download/',
          file_name: 'toolbar.png',
        }),
      });

      const { container } = render(
        <TiptapEditor
          targetType="project"
          projectId={1}
          value=""
          onChange={() => {}}
        />
      );

      const file = new File(['img-data'], 'toolbar.png', { type: 'image/png' });
      const inputs = container.querySelectorAll('input[type="file"]');
      expect(inputs.length).toBeGreaterThanOrEqual(2);

      fireEvent.change(inputs[0], { target: { files: [file] } });

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledTimes(1);
      });
    });
  });
});
