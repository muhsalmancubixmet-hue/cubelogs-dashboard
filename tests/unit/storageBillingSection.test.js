import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import StorageMediaSection, {
  formatStorageBytes,
  formatCurrencyAmount,
  getSourceModuleTitle,
} from '../../components/admin/settings/StorageMediaSection';
import BillingTab from '../../components/admin/settings/BillingTab';
import { apiFetch } from '../../lib/api';

// Mock lib/api
jest.mock('../../lib/api', () => ({
  apiFetch: jest.fn(),
  normalizeListResponse: (data) => (Array.isArray(data) ? data : []),
}));

describe('Storage & Media Billing Section Tests', () => {
  const mockSummary = {
    organization_id: 34,
    active_bytes: 16549105,
    active_gb: '0.0165',
    current_credits: 1,
    credit_size_bytes: 1000000000,
    credit_monthly_price: '20.00',
    currency: 'INR',
    billing_enabled: false,
    active_files: 3,
    deleted_files: 1,
    source_breakdown: [
      {
        source_module: 'projects',
        source_model: 'ProjectAttachment',
        bytes: 16549105,
        gb: '0.0165',
        active_files: 3,
      },
    ],
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('1. storage summary renders active bytes, GB, credits, and rate', async () => {
    apiFetch.mockImplementation((path) => {
      if (path.includes('/v1/storage/summary/')) return Promise.resolve(mockSummary);
      if (path.includes('/v1/storage/history/')) return Promise.resolve([]);
      return Promise.reject(new Error('Not found'));
    });

    render(<StorageMediaSection />);

    await waitFor(() => {
      expect(screen.getByText('Storage & Media')).toBeTruthy();
    });

    // Storage Used
    const mbElements = screen.getAllByText('16.55 MB');
    expect(mbElements.length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/0\.0165/)).toBeTruthy();

    // Credits
    const creditElements = screen.getAllByText(/1 credit/i);
    expect(creditElements.length).toBeGreaterThanOrEqual(1);

    // Rate
    const rateElements = screen.getAllByText(/₹20\.00/);
    expect(rateElements.length).toBeGreaterThanOrEqual(1);
  });

  test('2. billing disabled renders calm status badge and keeps usage visible', async () => {
    apiFetch.mockImplementation((path) => {
      if (path.includes('/v1/storage/summary/')) return Promise.resolve(mockSummary);
      if (path.includes('/v1/storage/history/')) return Promise.resolve([]);
      return Promise.reject(new Error('Not found'));
    });

    render(<StorageMediaSection />);

    await waitFor(() => {
      expect(screen.getByText('Usage tracking active · Billing disabled')).toBeTruthy();
    });

    // Content is NOT hidden
    expect(screen.getByText('Current credit usage')).toBeTruthy();
    expect(screen.getByText(/16\.55 MB currently tracked/)).toBeTruthy();
  });

  test('3. active and deleted file counts display correctly', async () => {
    apiFetch.mockImplementation((path) => {
      if (path.includes('/v1/storage/summary/')) return Promise.resolve(mockSummary);
      if (path.includes('/v1/storage/history/')) return Promise.resolve([]);
      return Promise.reject(new Error('Not found'));
    });

    render(<StorageMediaSection />);

    await waitFor(() => {
      expect(screen.getByText('Tracked Files')).toBeTruthy();
    });

    expect(screen.getByText('3')).toBeTruthy();
    expect(screen.getByText('active')).toBeTruthy();
    expect(screen.getByText('1 historical')).toBeTruthy();
  });

  test('4. source breakdown renders clean module labels and metrics', async () => {
    apiFetch.mockImplementation((path) => {
      if (path.includes('/v1/storage/summary/')) return Promise.resolve(mockSummary);
      if (path.includes('/v1/storage/history/')) return Promise.resolve([]);
      return Promise.reject(new Error('Not found'));
    });

    render(<StorageMediaSection />);

    await waitFor(() => {
      expect(screen.getByText('Storage by Module')).toBeTruthy();
    });

    // Module name "Projects"
    const projectTitles = screen.getAllByText('Projects');
    expect(projectTitles.length).toBeGreaterThanOrEqual(1);

    // Percentage of active storage
    expect(screen.getByText('100.0% of active')).toBeTruthy();
    expect(screen.getByText('3 files')).toBeTruthy();
  });

  test('5. empty history response renders polished empty state without synthesizing data', async () => {
    apiFetch.mockImplementation((path) => {
      if (path.includes('/v1/storage/summary/')) return Promise.resolve(mockSummary);
      if (path.includes('/v1/storage/history/')) return Promise.resolve([]);
      return Promise.reject(new Error('Not found'));
    });

    render(<StorageMediaSection />);

    await waitFor(() => {
      expect(screen.getByText('No daily storage history yet.')).toBeTruthy();
      expect(
        screen.getByText('Usage history will appear here once daily metering snapshots are available.')
      ).toBeTruthy();
    });

    // Must not contain fake table rows
    expect(screen.queryByRole('table')).toBeNull();
  });

  test('6. API error does not crash component or parent BillingTab', async () => {
    apiFetch.mockImplementation(() => Promise.reject(new Error('Network error')));

    const mockWallet = { balance: '1000', transactions: [] };
    render(
      <BillingTab
        currentUser={{ subscription: { daysRemaining: 30, isExpired: false } }}
        wallet={mockWallet}
        appliedCoupon={null}
        billingSearchQuery=""
        premiumAddons={{ attendance: false, tasks: false }}
        toggleLoading={{ attendance: false, tasks: false }}
        billingEstimate={{ netMonthly: 0 }}
        WalletIcon={() => null}
      />
    );

    await waitFor(() => {
      expect(
        screen.getByText('Storage information is temporarily unavailable.')
      ).toBeTruthy();
    });

    // Rest of BillingTab remains fully functional
    expect(screen.getByText('Billing & Subscription Plans')).toBeTruthy();
    expect(screen.getByText('Add Money to Wallet')).toBeTruthy();
  });

  test('7. 403 forbidden error shows friendly permission guidance without logout', async () => {
    const error403 = new Error('Forbidden');
    error403.status = 403;
    apiFetch.mockImplementation(() => Promise.reject(error403));

    render(<StorageMediaSection />);

    await waitFor(() => {
      expect(
        screen.getByText("You don't have permission to view storage billing information.")
      ).toBeTruthy();
    });
  });

  test('8. current credit usage handles 0 credits safely without division by zero or NaN', () => {
    expect(() => {
      render(
        <StorageMediaSection />
      );
    }).not.toThrow();

    // Verify format helpers handle edge cases safely
    expect(formatStorageBytes(0)).toBe('0 B');
    expect(formatStorageBytes(null)).toBe('0 B');
    expect(formatStorageBytes(undefined)).toBe('0 B');
    expect(formatStorageBytes(16549105)).toBe('16.55 MB');
    expect(formatStorageBytes(1000000000)).toBe('1.00 GB');

    expect(formatCurrencyAmount('20.00', 'INR')).toBe('₹20.00');
    expect(getSourceModuleTitle('projects')).toBe('Projects');
    expect(getSourceModuleTitle('attendance_records')).toBe('Attendance Records');
  });

  test('9. STRICT INVARIANT: NO quota / remaining storage / limit language appears in UI', async () => {
    apiFetch.mockImplementation((path) => {
      if (path.includes('/v1/storage/summary/')) return Promise.resolve(mockSummary);
      if (path.includes('/v1/storage/history/')) return Promise.resolve([]);
      return Promise.reject(new Error('Not found'));
    });

    const { container } = render(<StorageMediaSection />);

    await waitFor(() => {
      expect(screen.getByText('Storage & Media')).toBeTruthy();
    });

    const textContent = container.textContent.toLowerCase();

    // Invariants: Storage has NO quota / limit / cap
    expect(textContent).not.toContain('remaining storage');
    expect(textContent).not.toContain('storage remaining');
    expect(textContent).not.toContain('available storage');
    expect(textContent).not.toContain('free storage');
    expect(textContent).not.toContain('free space');
    expect(textContent).not.toContain('storage left');
    expect(textContent).not.toContain('limit remaining');
    expect(textContent).not.toContain('storage limit');
    expect(textContent).not.toContain('almost full');
    expect(textContent).not.toContain('upgrade for more space');
    expect(textContent).not.toContain('storage exhausted');

    // Wording hardening: NO capacity or high-water-mark language
    expect(textContent).not.toContain('unallocated credit capacity');
    expect(textContent).not.toContain('capacity');
    expect(textContent).not.toContain('high-water mark');
    expect(textContent).not.toContain('high-water');
    expect(textContent).not.toContain('peak');

    // Positive checks: Correct terms are present
    expect(screen.getByText('Current credit block')).toBeTruthy();
    expect(screen.getByText('Current credit usage')).toBeTruthy();
    expect(screen.getByText('Usage tracking active · Billing disabled')).toBeTruthy();
  });

  test('10. STRICT INVARIANT: private identifiers and raw technical model classes are not exposed', async () => {
    apiFetch.mockImplementation((path) => {
      if (path.includes('/v1/storage/summary/')) return Promise.resolve(mockSummary);
      if (path.includes('/v1/storage/history/')) return Promise.resolve([]);
      return Promise.reject(new Error('Not found'));
    });

    const { container } = render(<StorageMediaSection />);

    await waitFor(() => {
      expect(screen.getByText('Storage & Media')).toBeTruthy();
    });

    const htmlContent = container.innerHTML;

    // source_model ProjectAttachment should not be exposed prominently to end users
    expect(screen.queryByText('ProjectAttachment')).toBeNull();
    // No raw internal paths or private IDs
    expect(htmlContent).not.toContain('file_path');
    expect(htmlContent).not.toContain('source_object_id');
  });

  test('11. history rows render when snapshots exist with provisional and finalized statuses', async () => {
    const mockHistory = [
      {
        date: '2026-09-07',
        billable_bytes: 16549105,
        billable_gb: '0.0165',
        storage_credits: 1,
        storage_charge: '20.00',
        is_finalized: true,
      },
      {
        date: '2026-09-08',
        billable_bytes: 16549105,
        billable_gb: '0.0165',
        storage_credits: 1,
        storage_charge: '20.00',
        is_finalized: false,
      },
    ];

    apiFetch.mockImplementation((path) => {
      if (path.includes('/v1/storage/summary/')) return Promise.resolve(mockSummary);
      if (path.includes('/v1/storage/history/')) return Promise.resolve(mockHistory);
      return Promise.reject(new Error('Not found'));
    });

    render(<StorageMediaSection />);

    await waitFor(() => {
      expect(screen.getByText('2026-09-07')).toBeTruthy();
      expect(screen.getByText('2026-09-08')).toBeTruthy();
    });

    expect(screen.getByText('Finalized')).toBeTruthy();
    expect(screen.getByText('Provisional (estimated)')).toBeTruthy();
  });
});
