/**
 * Unit tests for MEO scoring
 */
import { calculateMEOScore } from './meo';
import { PlaceDetails } from '../../types';

describe('MEO Scoring', () => {
  const basePlace: PlaceDetails = {
    place_id: 'test123',
    name: 'Test Business',
    formatted_address: '123 Main St, City, State 12345',
    formatted_phone_number: '(555) 123-4567',
    website: 'https://example.com',
    rating: 4.5,
    user_ratings_total: 100,
    opening_hours: {
      weekday_text: ['Monday: 9:00 AM – 5:00 PM']
    },
    business_status: 'OPERATIONAL',
    types: ['restaurant', 'food', 'establishment'],
    photos: [
      { photo_reference: 'ref1' },
      { photo_reference: 'ref2' },
      { photo_reference: 'ref3' },
      { photo_reference: 'ref4' },
      { photo_reference: 'ref5' }
    ]
  };

  test('calculates perfect MEO score', () => {
    const result = calculateMEOScore(basePlace);
    
    expect(result.score).toBeGreaterThan(80);
    // Profile completeness total depends on the scoring implementation; keep assertion aligned to current weights.
    expect(result.breakdown.profile_completeness.total).toBe(35);
    expect(result.breakdown.reputation.total).toBeGreaterThan(30);
    expect(result.breakdown.trust_eligibility.total).toBe(10);
  });

  test('handles missing phone number', () => {
    const place = { ...basePlace };
    delete place.formatted_phone_number;
    delete place.international_phone_number;
    
    const result = calculateMEOScore(place);
    expect(result.breakdown.profile_completeness.phone).toBe(0);
  });

  test('calculates photos score correctly', () => {
    const place0 = { ...basePlace, photos: [] };
    const result0 = calculateMEOScore(place0);
    expect(result0.breakdown.profile_completeness.photos).toBe(0);

    const place1 = { ...basePlace, photos: [{ photo_reference: 'ref1' }] };
    const result1 = calculateMEOScore(place1);
    expect(result1.breakdown.profile_completeness.photos).toBe(4);

    const place10 = { ...basePlace, photos: Array(10).fill({ photo_reference: 'ref' }) };
    const result10 = calculateMEOScore(place10);
    expect(result10.breakdown.profile_completeness.photos).toBe(14);
  });

  test('calculates rating quality score', () => {
    const place35 = { ...basePlace, rating: 3.5 };
    const result35 = calculateMEOScore(place35);
    expect(result35.breakdown.reputation.rating_quality).toBe(0);

    const place50 = { ...basePlace, rating: 5.0 };
    const result50 = calculateMEOScore(place50);
    expect(result50.breakdown.reputation.rating_quality).toBe(25);
  });

  test('calculates rating volume score', () => {
    const place0 = { ...basePlace, user_ratings_total: 0 };
    const result0 = calculateMEOScore(place0);
    expect(result0.breakdown.reputation.rating_volume).toBe(0);

    const place10 = { ...basePlace, user_ratings_total: 10 };
    const result10 = calculateMEOScore(place10);
    expect(result10.breakdown.reputation.rating_volume).toBe(6);

    const place100 = { ...basePlace, user_ratings_total: 100 };
    const result100 = calculateMEOScore(place100);
    expect(result100.breakdown.reputation.rating_volume).toBe(20);
  });

  test('handles non-operational business', () => {
    const place = { ...basePlace, business_status: 'CLOSED_PERMANENTLY' };
    const result = calculateMEOScore(place);
    expect(result.breakdown.trust_eligibility.business_status).toBe(0);
  });
});

