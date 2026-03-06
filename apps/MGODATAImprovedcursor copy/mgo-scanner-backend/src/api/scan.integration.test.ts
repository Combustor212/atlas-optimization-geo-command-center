/**
 * Integration test for scan endpoint (mocked)
 */
import { PlaceDetails } from '../types';
import { calculateMEOScore } from '../lib/scoring/meo';
import { calculateGeoScore } from '../lib/scoring/geo';
import { calculateCombinedScore } from '../lib/scoring/combined';

describe('Scan Integration', () => {
  test('returns deterministic scores with mocked data', () => {
    // Mock place details
    const mockPlace: PlaceDetails = {
      place_id: 'ChIJtest123',
      name: 'Test Business',
      formatted_address: '123 Main St, Test City, ST 12345',
      formatted_phone_number: '(555) 123-4567',
      website: 'https://testbusiness.com',
      rating: 4.5,
      user_ratings_total: 150,
      opening_hours: {
        weekday_text: [
          'Monday: 9:00 AM – 5:00 PM',
          'Tuesday: 9:00 AM – 5:00 PM'
        ]
      },
      business_status: 'OPERATIONAL',
      types: ['restaurant', 'food', 'establishment'],
      photos: Array(10).fill({ photo_reference: 'ref' })
    };

    // Calculate MEO
    const meoScore = calculateMEOScore(mockPlace);
    expect(meoScore.score).toBeGreaterThan(0);
    expect(meoScore.score).toBeLessThanOrEqual(100);

    // Mock GEO data
    const mockGeoAnalysis = {
      found_nap: {
        name: 'Test Business',
        address: '123 Main St',
        phone: '+15551234567'
      },
      nap_match: {
        name: 'match' as const,
        address: 'match' as const,
        phone: 'match' as const
      },
      localbusiness_schema: {
        present: true,
        valid: true,
        has_nap: true,
        sameAsCount: 3
      },
      sameAs: ['https://facebook.com', 'https://twitter.com', 'https://yelp.com'],
      service_area_clarity: 'clear' as const,
      what_where_clarity: 'clear' as const,
      faq_signals: {
        present: true,
        evidence: ['FAQ']
      }
    };

    const mockCitations = [
      {
        directory: 'Yelp',
        best_listing_url: 'https://yelp.com/biz/test',
        extracted_nap: mockGeoAnalysis.found_nap,
        match_quality: 'match' as const
      }
    ];

    // Calculate GEO
    const geoScore = calculateGeoScore(mockGeoAnalysis, mockCitations);
    expect(geoScore.score).toBeGreaterThan(0);
    expect(geoScore.score).toBeLessThanOrEqual(100);

    // Calculate Combined
    const combinedScore = calculateCombinedScore(meoScore.score, geoScore.score);
    expect(combinedScore.score).toBeGreaterThan(0);
    expect(combinedScore.score).toBeLessThanOrEqual(100);
    expect(combinedScore.formula).toBe('round(0.55*MEO + 0.45*GEO)');

    // Verify formula
    const expectedCombined = Math.round(0.55 * meoScore.score + 0.45 * geoScore.score);
    expect(combinedScore.score).toBe(expectedCombined);
  });
});

