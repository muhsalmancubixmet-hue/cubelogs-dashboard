import { normalizeListResponse } from '@/lib/api';

describe('apiClient utilities', () => {
  it('normalizeListResponse handles array and pagination objects correctly', () => {
    expect(normalizeListResponse([1, 2, 3])).toEqual([1, 2, 3]);
    expect(normalizeListResponse({ results: [4, 5] })).toEqual([4, 5]);
    expect(normalizeListResponse({ data: [6, 7] })).toEqual([6, 7]);
    expect(normalizeListResponse(null)).toEqual([]);
  });
});
