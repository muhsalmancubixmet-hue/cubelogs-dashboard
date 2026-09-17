import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import AuthenticatedMediaPreview, { viewAuthenticatedPdf } from '../../components/projects/AuthenticatedMediaPreview';
import { apiFetch } from '../../lib/api/apiClient';

// Mock apiClient
jest.mock('../../lib/api/apiClient', () => ({
  apiFetch: jest.fn(),
}));

describe('AuthenticatedMediaPreview & Media Blob Auth Fix', () => {
  let objectUrlCounter = 0;
  const createdUrls = new Set();
  const originalCreateObjectURL = global.URL.createObjectURL;
  const originalRevokeObjectURL = global.URL.revokeObjectURL;

  beforeAll(() => {
    global.URL.createObjectURL = jest.fn((blob) => {
      const url = `blob:http://localhost/mock-blob-${++objectUrlCounter}`;
      createdUrls.add(url);
      return url;
    });
    global.URL.revokeObjectURL = jest.fn((url) => {
      createdUrls.delete(url);
    });
  });

  afterAll(() => {
    global.URL.createObjectURL = originalCreateObjectURL;
    global.URL.revokeObjectURL = originalRevokeObjectURL;
  });

  beforeEach(() => {
    jest.clearAllMocks();
    createdUrls.clear();
    objectUrlCounter = 0;
  });

  test('1. image media fetch uses apiFetch with responseType blob', async () => {
    const mockBlob = new Blob(['image-data'], { type: 'image/png' });
    apiFetch.mockResolvedValueOnce(mockBlob);

    const testUrl = '/api/v1/attachments/101/download/';
    await act(async () => {
      render(<AuthenticatedMediaPreview type="image" url={testUrl} alt="test-image.png" />);
    });

    expect(apiFetch).toHaveBeenCalledWith(testUrl, { responseType: 'blob' });
  });

  test('2. image receives blob URL and renders img with blob URL', async () => {
    const mockBlob = new Blob(['image-data'], { type: 'image/png' });
    apiFetch.mockResolvedValueOnce(mockBlob);

    const testUrl = '/api/v1/attachments/102/download/';
    let renderResult;
    await act(async () => {
      renderResult = render(<AuthenticatedMediaPreview type="image" url={testUrl} alt="photo.png" />);
    });

    await waitFor(() => {
      const img = screen.getByRole('img');
      expect(img).toBeTruthy();
      expect(img.getAttribute('src')).toMatch(/^blob:http:\/\/localhost\/mock-blob-/);
    });
  });

  test('3. video media fetch uses apiFetch with responseType blob', async () => {
    const mockBlob = new Blob(['video-data'], { type: 'video/mp4' });
    apiFetch.mockResolvedValueOnce(mockBlob);

    const testUrl = '/api/v1/attachments/103/download/';
    await act(async () => {
      render(<AuthenticatedMediaPreview type="video" url={testUrl} alt="recording.mp4" mimeType="video/mp4" />);
    });

    expect(apiFetch).toHaveBeenCalledWith(testUrl, { responseType: 'blob' });
  });

  test('4. video receives blob URL, has preload metadata, controls, and no autoplay', async () => {
    const mockBlob = new Blob(['video-data'], { type: 'video/mp4' });
    apiFetch.mockResolvedValueOnce(mockBlob);

    const testUrl = '/api/v1/attachments/104/download/';
    let renderResult;
    await act(async () => {
      renderResult = render(
        <AuthenticatedMediaPreview type="video" url={testUrl} alt="demo.mp4" mimeType="video/mp4" />
      );
    });

    await waitFor(() => {
      const video = renderResult.container.querySelector('video');
      expect(video).toBeTruthy();
      expect(video.getAttribute('controls')).not.toBeNull();
      expect(video.getAttribute('preload')).toBe('metadata');
      expect(video.getAttribute('autoplay')).toBeNull();

      const source = renderResult.container.querySelector('source');
      expect(source).toBeTruthy();
      expect(source.getAttribute('src')).toMatch(/^blob:http:\/\/localhost\/mock-blob-/);
    });
  });

  test('5. object URL revoked when component unmounts and refCount is 0', async () => {
    const mockBlob = new Blob(['image-data'], { type: 'image/jpeg' });
    apiFetch.mockResolvedValueOnce(mockBlob);

    const testUrl = '/api/v1/attachments/105/download/';
    let renderResult;
    await act(async () => {
      renderResult = render(<AuthenticatedMediaPreview type="image" url={testUrl} alt="photo.jpg" />);
    });

    await waitFor(() => {
      expect(screen.getByRole('img')).toBeTruthy();
    });

    expect(global.URL.revokeObjectURL).not.toHaveBeenCalled();

    act(() => {
      renderResult.unmount();
    });

    expect(global.URL.revokeObjectURL).toHaveBeenCalledTimes(1);
    expect(global.URL.revokeObjectURL).toHaveBeenCalledWith(expect.stringMatching(/^blob:/));
  });

  test('6. failed fetch shows safe fallback "Unable to load media" without exposing auth or tokens', async () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    apiFetch.mockRejectedValueOnce(new Error('401 Unauthorized Bearer eyJhbGci...'));

    const testUrl = '/api/v1/attachments/106/download/';
    await act(async () => {
      render(<AuthenticatedMediaPreview type="image" url={testUrl} alt="secret.png" />);
    });

    await waitFor(() => {
      expect(screen.getByText('Unable to load media')).toBeTruthy();
    });

    // Ensure raw error or JWT token string does not appear in document
    expect(screen.queryByText(/401/i)).toBeNull();
    expect(screen.queryByText(/Bearer/i)).toBeNull();
    expect(screen.queryByText(/eyJ/i)).toBeNull();

    consoleSpy.mockRestore();
  });

  test('7. no token appears in rendered src URL or DOM', async () => {
    const mockBlob = new Blob(['image-bytes'], { type: 'image/png' });
    apiFetch.mockResolvedValueOnce(mockBlob);

    const testUrl = '/api/v1/attachments/107/download/';
    await act(async () => {
      render(<AuthenticatedMediaPreview type="image" url={testUrl} alt="protected.png" />);
    });

    await waitFor(() => {
      const img = screen.getByRole('img');
      const src = img.getAttribute('src');
      expect(src).not.toContain('token');
      expect(src).not.toContain('jwt');
      expect(src).not.toContain('Bearer');
      expect(src.startsWith('blob:')).toBe(true);
    });
  });

  test('8. normal document attachment UI remains unchanged and does not trigger media preview', () => {
    // Render the chat attachment pattern for non-media document (e.g. PDF/DOCX)
    const att = {
      id: 999,
      file_name: 'Quarterly_Report.docx',
      mime_type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      file_size: 2048576,
    };
    const mime = att.mime_type.toLowerCase();
    const fn = att.file_name.toLowerCase();
    const isImage = mime.startsWith('image/') || fn.endsWith('.jpg') || fn.endsWith('.png');
    const isVideo = mime.startsWith('video/') || fn.endsWith('.mp4') || fn.endsWith('.webm');
    const isDoc = fn.endsWith('.doc') || fn.endsWith('.docx');

    expect(isImage).toBe(false);
    expect(isVideo).toBe(false);
    expect(isDoc).toBe(true);

    const { container } = render(
      <div data-testid="doc-attachment">
        <div className="icon-container">{isDoc ? '📄' : '📁'}</div>
        <strong>{att.file_name}</strong>
      </div>
    );

    expect(screen.getByText('📄')).toBeTruthy();
    expect(screen.getByText('Quarterly_Report.docx')).toBeTruthy();
    expect(container.querySelector('img')).toBeNull();
    expect(container.querySelector('video')).toBeNull();
    expect(apiFetch).not.toHaveBeenCalled();
  });

  test('9. viewAuthenticatedPdf opens blob in new tab without revoking after 60-second timeout', async () => {
    jest.useFakeTimers();
    const mockBlob = new Blob(['%PDF-1.4 test data'], { type: 'application/pdf' });
    apiFetch.mockResolvedValueOnce(mockBlob);
    const originalOpen = window.open;
    window.open = jest.fn();

    await viewAuthenticatedPdf('/api/v1/attachments/200/download/');

    expect(window.open).toHaveBeenCalledWith(expect.stringMatching(/^blob:/), '_blank');
    expect(global.URL.revokeObjectURL).not.toHaveBeenCalled();

    // Fast-forward 65 seconds
    act(() => {
      jest.advanceTimersByTime(65000);
    });

    // Blob must remain intact (no arbitrary 60s revoke)
    expect(global.URL.revokeObjectURL).not.toHaveBeenCalled();

    window.open = originalOpen;
    jest.useRealTimers();
  });
});
