/**
 * SEO Visibility Score Test Harness
 * No network calls - mocks Places API and verifies output structure.
 */

jest.mock('../lib/places', () => ({
  textSearchGetRank: jest.fn(),
}));

import { computeSeoVisibilityScore } from './seoVisibilityScore';
import { textSearchGetRank } from '../lib/places';
import type { PlaceDetails } from '../types';

const mockTextSearchGetRank = textSearchGetRank as jest.MockedFunction<typeof textSearchGetRank>;

const mockPlace: PlaceDetails = {
  place_id: 'ChIJtest123',
  name: "Joe's Plumber",
  formatted_address: '123 Main St, Cincinnati, OH 45202, USA',
  geometry: { location: { lat: 39.1, lng: -84.5 } },
  website: 'https://joesplumber.com',
  formatted_phone_number: '+15551234567',
  opening_hours: { weekday_text: ['Mon-Fri 8am-5pm'] },
  editorial_summary: { overview: 'Local plumber serving Cincinnati' },
  types: ['plumber', 'plumbing_contractor'],
  primaryType: 'plumber',
  primaryTypeDisplayName: { text: 'Plumber' },
};

describe('computeSeoVisibilityScore', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns valid structure with seo, confidence, breakdown', async () => {
    mockTextSearchGetRank.mockResolvedValue(2);

    const result = await computeSeoVisibilityScore({
      place: mockPlace,
      location: 'Cincinnati, OH 45202',
      categoryLabel: 'Plumber',
      gbpFacts: { completenessScore: 80, hasDescription: true, hasHours: true, hasPhone: true },
    });

    expect(result).toHaveProperty('seo');
    expect(result).toHaveProperty('confidence');
    expect(result).toHaveProperty('breakdown');
    expect(typeof result.seo).toBe('number');
    expect(result.seo).toBeGreaterThanOrEqual(0);
    expect(result.seo).toBeLessThanOrEqual(100);
    expect(['high', 'medium', 'low']).toContain(result.confidence);
    expect(result.breakdown).toHaveProperty('demand');
    expect(result.breakdown).toHaveProperty('visibility');
    expect(result.breakdown).toHaveProperty('coverage');
    expect(result.breakdown).toHaveProperty('keywordsEvaluated');
    expect(result.breakdown).toHaveProperty('keywordsFound');
    expect(result.breakdown).toHaveProperty('topKeywords');
    expect(Array.isArray(result.breakdown.topKeywords)).toBe(true);
  });

  it('uses mocked ranks for visibility calculation', async () => {
    mockTextSearchGetRank
      .mockResolvedValueOnce(1)
      .mockResolvedValueOnce(5)
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(10)
      .mockResolvedValueOnce(15);

    const result = await computeSeoVisibilityScore({
      place: mockPlace,
      location: 'Cincinnati, OH 45202',
      categoryLabel: 'Plumber',
    });

    expect(mockTextSearchGetRank).toHaveBeenCalled();
    expect(result.breakdown.keywordsFound).toBeGreaterThan(0);
    expect(result.breakdown.keywordsEvaluated).toBeLessThanOrEqual(5);
  });

  it('handles minimal input gracefully', async () => {
    mockTextSearchGetRank.mockResolvedValue(null);

    const result = await computeSeoVisibilityScore({
      place: { ...mockPlace, formatted_address: '', primaryType: undefined, primaryTypeDisplayName: undefined },
      location: '',
      categoryLabel: '',
    });

    expect(result.seo).toBeGreaterThanOrEqual(0);
    expect(result.seo).toBeLessThanOrEqual(100);
    expect(result.confidence).toBe('low');
    expect(result.breakdown.keywordsEvaluated).toBeLessThanOrEqual(5);
  });

  it('blends completeness when confidence is low', async () => {
    mockTextSearchGetRank.mockResolvedValue(null);

    const result = await computeSeoVisibilityScore({
      place: mockPlace,
      location: 'Cincinnati, OH',
      categoryLabel: 'Plumber',
      gbpFacts: { completenessScore: 90, hasDescription: true, hasHours: true, hasPhone: true },
    });

    expect(result.seo).toBeGreaterThanOrEqual(0);
    expect(result.seo).toBeLessThanOrEqual(100);
  });
});
