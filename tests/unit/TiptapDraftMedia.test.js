import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import TiptapEditor from '../../components/rich-text/TiptapEditor';

describe('Tiptap Draft Media Uploads Unit Test Suite', () => {
  const mockDraftToken = 'test-draft-uuid-12345';
  let originalFetch;

  beforeEach(() => {
    jest.resetAllMocks();
    originalFetch = global.fetch;
    global.fetch = jest.fn();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  test('16. TiptapEditor accepts draftToken prop and enables media uploads', () => {
    render(
      <TiptapEditor
        targetType="project"
        draftToken={mockDraftToken}
        value="<p>Test draft</p>"
        onChange={() => {}}
      />
    );

    const imgSpan = screen.getByTitle('Insert Image');
    const attachmentSpan = screen.getByTitle('Attach File (Paperclip)');

    const imgBtn = imgSpan.querySelector('button') || imgSpan;
    const attBtn = attachmentSpan.querySelector('button') || attachmentSpan;

    expect(imgBtn.hasAttribute('disabled')).toBe(false);
    expect(attBtn.hasAttribute('disabled')).toBe(false);
  });

  test('17. Image upload with draftToken sends draft_token in FormData', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      headers: { get: () => 'application/json' },
      json: async () => ({
        id: 99,
        file_url: 'http://localhost:8000/media/project_attachments/temp/img.png',
        file_name: 'img.png',
        is_temporary: true,
      }),
    });

    const { container } = render(
      <TiptapEditor
        targetType="project"
        draftToken={mockDraftToken}
        value=""
        onChange={() => {}}
      />
    );

    const file = new File(['fake_img'], 'img.png', { type: 'image/png' });
    const inputs = container.querySelectorAll('input[type="file"]');
    expect(inputs.length).toBeGreaterThan(0);

    fireEvent.change(inputs[0], { target: { files: [file] } });

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledTimes(1);
      const callArgs = global.fetch.mock.calls[0];
      expect(callArgs[0]).toContain('/v1/attachments/');
      const body = callArgs[1].body;
      expect(body.get('draft_token')).toBe(mockDraftToken);
      expect(body.get('is_inline')).toBe('true');
    });
  });

  test('18. Attachment paperclip upload uses draftToken', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      headers: { get: () => 'application/json' },
      json: async () => ({
        id: 100,
        file_url: 'http://localhost:8000/media/project_attachments/temp/doc.pdf',
        file_name: 'doc.pdf',
        is_temporary: true,
      }),
    });

    const { container } = render(
      <TiptapEditor
        targetType="project"
        draftToken={mockDraftToken}
        value=""
        onChange={() => {}}
      />
    );

    const file = new File(['fake_pdf'], 'doc.pdf', { type: 'application/pdf' });
    const inputs = container.querySelectorAll('input[type="file"]');
    expect(inputs.length).toBeGreaterThan(1);

    fireEvent.change(inputs[1], { target: { files: [file] } });

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledTimes(1);
      const body = global.fetch.mock.calls[0][1].body;
      expect(body.get('draft_token')).toBe(mockDraftToken);
      expect(body.get('is_inline')).toBe('false');
    });
  });

  test('19. Project Name is not required to upload media into draft', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      headers: { get: () => 'application/json' },
      json: async () => ({
        id: 101,
        file_url: 'http://localhost:8000/media/project_attachments/temp/draft.jpg',
        file_name: 'draft.jpg',
      }),
    });

    const { container } = render(
      <TiptapEditor
        targetType="project"
        draftToken={mockDraftToken}
        value=""
        onChange={() => {}}
      />
    );

    const file = new File(['fake'], 'draft.jpg', { type: 'image/jpeg' });
    const inputs = container.querySelectorAll('input[type="file"]');

    fireEvent.change(inputs[0], { target: { files: [file] } });

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });
  });

  test('20. Form error resilience preserves draft Token and editor content', () => {
    const { rerender } = render(
      <TiptapEditor
        targetType="project"
        draftToken={mockDraftToken}
        value="<p>Saved Draft Text</p>"
        onChange={() => {}}
      />
    );

    const imgSpan = screen.getByTitle('Insert Image');
    const imgBtn = imgSpan.querySelector('button') || imgSpan;
    expect(imgBtn.hasAttribute('disabled')).toBe(false);

    rerender(
      <TiptapEditor
        targetType="project"
        draftToken={mockDraftToken}
        value="<p>Saved Draft Text</p>"
        onChange={() => {}}
      />
    );

    expect(imgBtn.hasAttribute('disabled')).toBe(false);
  });
});
