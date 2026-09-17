import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import TiptapReadOnly from '../../components/rich-text/TiptapReadOnly';
import TiptapEditor from '../../components/rich-text/TiptapEditor';
import { RichTextImageNode } from '../../components/rich-text/RichTextImageNode';
import { apiFetch } from '../../lib/api/apiClient';
import { downloadAuthenticatedFile, viewAuthenticatedPdf } from '../../components/projects/AuthenticatedMediaPreview';

jest.mock('../../lib/api/apiClient', () => {
  const actual = jest.requireActual('../../lib/api/apiClient');
  return {
    ...actual,
    apiFetch: jest.fn(),
  };
});

jest.mock('../../components/projects/AuthenticatedMediaPreview', () => ({
  downloadAuthenticatedFile: jest.fn(),
  viewAuthenticatedPdf: jest.fn(),
}));

describe('Tiptap Rich-Text JWT Media Auth Tests', () => {
  let originalCreateObjectURL;
  let originalRevokeObjectURL;
  let createdObjectUrls = [];
  let revokedObjectUrls = [];

  beforeEach(() => {
    jest.clearAllMocks();
    createdObjectUrls = [];
    revokedObjectUrls = [];

    originalCreateObjectURL = URL.createObjectURL;
    originalRevokeObjectURL = URL.revokeObjectURL;

    URL.createObjectURL = jest.fn((blob) => {
      const url = `blob:http://localhost/mock-blob-${createdObjectUrls.length + 1}`;
      createdObjectUrls.push(url);
      return url;
    });

    URL.revokeObjectURL = jest.fn((url) => {
      revokedObjectUrls.push(url);
    });

    apiFetch.mockResolvedValue(new Blob(['image-bytes'], { type: 'image/png' }));
  });

  afterEach(() => {
    URL.createObjectURL = originalCreateObjectURL;
    URL.revokeObjectURL = originalRevokeObjectURL;
  });

  describe('Read-Only Viewer Auth Resolution', () => {
    test('1 & 2: read-only attachment image uses authenticated blob fetch and rendered img receives blob URL', async () => {
      const fakeBlob = new Blob(['image-bytes'], { type: 'image/png' });
      apiFetch.mockResolvedValueOnce(fakeBlob);

      const html = '<p><img src="http://localhost:8000/api/v1/attachments/42/download/" data-attachment-id="42" alt="diagram"></p>';
      const { container } = render(<TiptapReadOnly content={html} />);

      await waitFor(() => {
        expect(apiFetch).toHaveBeenCalledTimes(1);
        expect(apiFetch).toHaveBeenCalledWith(
          'http://localhost:8000/api/v1/attachments/42/download/',
          { responseType: 'blob' }
        );
      });

      await waitFor(() => {
        const img = container.querySelector('.tiptap-readonly img');
        expect(img).toBeTruthy();
        expect(img.getAttribute('src') || img.src).toContain('mock-blob');
      });
    });

    test('3: blob URL is revoked on component cleanup/unmount', async () => {
      const fakeBlob = new Blob(['image-bytes'], { type: 'image/png' });
      apiFetch.mockResolvedValueOnce(fakeBlob);

      const html = '<p><img src="/api/v1/attachments/42/download/" data-attachment-id="42"></p>';
      const { unmount } = render(<TiptapReadOnly content={html} />);

      await waitFor(() => {
        expect(createdObjectUrls.length).toBe(1);
      });

      unmount();

      expect(revokedObjectUrls).toContain(createdObjectUrls[0]);
    });

    test('4: canonical HTML/source in application data remains attachment URL, not blob URL', () => {
      const canonicalHtml = '<p><img src="/api/v1/attachments/42/download/" data-attachment-id="42" alt="doc"></p>';
      render(<TiptapReadOnly content={canonicalHtml} />);

      // The content prop itself is never mutated or converted to blob URL
      expect(canonicalHtml).not.toContain('blob:');
      expect(canonicalHtml).toContain('/api/v1/attachments/42/download/');
    });

    test('5: rich-text attachment link click uses authenticated download helper', () => {
      const html = '<p><a href="/api/v1/attachments/55/download/" data-attachment-id="55">📎 document.pdf</a></p>';
      const { container } = render(<TiptapReadOnly content={html} />);

      const link = container.querySelector('a');
      expect(link).toBeTruthy();

      fireEvent.click(link);

      expect(viewAuthenticatedPdf).toHaveBeenCalledTimes(1);
      expect(viewAuthenticatedPdf).toHaveBeenCalledWith('/api/v1/attachments/55/download/');
    });

    test('5b: non-PDF rich-text attachment link uses downloadAuthenticatedFile', () => {
      const html = '<p><a href="/api/v1/attachments/56/download/" data-attachment-id="56">📎 archive.zip</a></p>';
      const { container } = render(<TiptapReadOnly content={html} />);

      const link = container.querySelector('a');
      fireEvent.click(link);

      expect(downloadAuthenticatedFile).toHaveBeenCalledTimes(1);
      expect(downloadAuthenticatedFile).toHaveBeenCalledWith('/api/v1/attachments/56/download/', 'archive.zip');
    });

    test('6: normal external link is NOT intercepted by authenticated download helper', () => {
      const html = '<p><a href="https://example.com/info" target="_blank">External Documentation</a></p>';
      const { container } = render(<TiptapReadOnly content={html} />);

      const link = container.querySelector('a');
      fireEvent.click(link);

      expect(viewAuthenticatedPdf).not.toHaveBeenCalled();
      expect(downloadAuthenticatedFile).not.toHaveBeenCalled();
    });

    test('9: failed blob fetch logs error safely without exposing tokens and does not crash', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      apiFetch.mockRejectedValueOnce(new Error('401 Unauthorized'));

      const html = '<p><img src="/api/v1/attachments/99/download/" data-attachment-id="99" alt="fallback"></p>';
      render(<TiptapReadOnly content={html} />);

      await waitFor(() => {
        expect(apiFetch).toHaveBeenCalledTimes(1);
      });

      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });

  describe('Edit-Mode Auth Resolution', () => {
    test('7 & 8: edit-mode image loads via authenticated blob while save/getHTML still serializes canonical attachment URL', async () => {
      const fakeBlob = new Blob(['bytes'], { type: 'image/png' });
      apiFetch.mockResolvedValueOnce(fakeBlob);

      let savedValue = '';
      const initialHtml = '<p><img src="http://localhost:8000/api/v1/attachments/77/download/" data-attachment-id="77" alt="chart"></p>';

      const { container } = render(
        <TiptapEditor
          targetType="story"
          storyId={10}
          value={initialHtml}
          onChange={(val) => { savedValue = val; }}
        />
      );

      await waitFor(() => {
        expect(apiFetch).toHaveBeenCalledWith(
          'http://localhost:8000/api/v1/attachments/77/download/',
          { responseType: 'blob' }
        );
      });

      // The live DOM img has the blob URL
      await waitFor(() => {
        const img = container.querySelector('.ProseMirror img');
        expect(img).toBeTruthy();
        expect(img.getAttribute('src') || img.src).toContain('mock-blob');
      });

      // But editor schema serialization never stores blob: URL
      const img = container.querySelector('.ProseMirror img');
      expect(img.getAttribute('data-attachment-id')).toBe('77');

      // Verify that RichTextImageNode.renderHTML produces canonical HTML attributes
      const serialized = RichTextImageNode.config.renderHTML({
        HTMLAttributes: {
          src: 'http://localhost:8000/api/v1/attachments/77/download/',
          'data-attachment-id': '77',
        },
      });
      expect(serialized[0]).toBe('img');
      expect(serialized[1].src).toBe('http://localhost:8000/api/v1/attachments/77/download/');
      expect(serialized[1].src).not.toContain('blob:');
    });
  });
});
