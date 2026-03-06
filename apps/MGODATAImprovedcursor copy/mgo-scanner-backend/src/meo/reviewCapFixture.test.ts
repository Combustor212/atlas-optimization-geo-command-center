/**
 * Review Reliability Cap Test Fixture
 * Critical test: 5.0 rating with 7 reviews MUST score ≤50 with "low" confidence
 */

import { calculateMEOScore } from './meoEngine';
import type { PlaceDetails } from '../types';

describe('Review Reliability Cap - Critical Fixture', () => {
  
  it('CRITICAL: 5.0 rating with 7 reviews MUST score ≤50 and confidence MUST be "low"', () => {
    // This is THE test that proves we fixed small business score inflation
    const mockPlace: PlaceDetails = {
      place_id: 'test_perfect_small_biz',
      name: 'Perfect Small Business',
      formatted_address: '123 Test St, Test City, ST 12345, USA',
      rating: 5.0,                    // PERFECT rating
      user_ratings_total: 7,          // Very LOW review count
      photos: Array(10).fill({ photo_reference: 'ref' }), // Perfect photos
      formatted_phone_number: '(555) 555-5555',
      website: 'https://example.com',
      opening_hours: {
        weekday_text: [
          'Monday: 9:00 AM – 5:00 PM',
          'Tuesday: 9:00 AM – 5:00 PM',
          'Wednesday: 9:00 AM – 5:00 PM',
          'Thursday: 9:00 AM – 5:00 PM',
          'Friday: 9:00 AM – 5:00 PM',
          'Saturday: 10:00 AM – 2:00 PM',
          'Sunday: Closed'
        ]
      },
      types: ['point_of_interest', 'establishment'],
      business_status: 'OPERATIONAL',
      geometry: {
        location: { lat: 40.0, lng: -80.0 }
      }
    };
    
    const result = calculateMEOScore('Perfect Small Business', 'Test City, ST', mockPlace);
    
    // CRITICAL ASSERTIONS
    console.log('\n=== CRITICAL TEST: Review Reliability Cap ===');
    console.log('Input: 5.0★ rating, 7 reviews, perfect profile');
    console.log(`Output: Score=${result.body.meoScore}, Confidence=${result.body.confidence}`);
    console.log(`Cap Applied: ${result.body.scoringBreakdown.reviewReliabilityCapApplied}`);
    console.log(`Cap Value: ${result.body.scoringBreakdown.reviewReliabilityCap}`);
    
    // 1. Score MUST be capped at 50 (reviews < 10)
    expect(result.body.meoScore).toBeLessThanOrEqual(50);
    expect(result.body.meoScore).toBeGreaterThanOrEqual(45); // But not below minimum
    
    // 2. Confidence MUST be "low"
    expect(result.body.confidence).toBe('low');
    
    // 3. Review reliability cap MUST be applied
    expect(result.body.scoringBreakdown.reviewReliabilityCapApplied).toBe(true);
    expect(result.body.scoringBreakdown.reviewReliabilityCap).toBe(50);
    
    // 4. finalScore MUST equal meoScore
    expect(result.body.meoScore).toBe(result.body.scoringBreakdown.finalScore);
    
    // 5. Should flag low reviews as deficiency
    expect(result.body.deficiencies.some(d => 
      d.toLowerCase().includes('review')
    )).toBe(true);
    
    // 6. Status and version
    expect(result.body.status).toBe('completed');
    expect(result.body.scoringVersion).toBe('v10.1');
  });
  
  it('Verify no cap for businesses with 150+ reviews', () => {
    const mockPlace: PlaceDetails = {
      place_id: 'test_established_biz',
      name: 'Established Business',
      formatted_address: '456 Test Ave, Test City, ST 12345, USA',
      rating: 4.8,
      user_ratings_total: 200,  // High review count
      photos: Array(15).fill({ photo_reference: 'ref' }),
      formatted_phone_number: '(555) 555-5555',
      website: 'https://example.com',
      opening_hours: {
        weekday_text: ['Monday: 9:00 AM – 5:00 PM']
      },
      types: ['point_of_interest', 'establishment'],
      business_status: 'OPERATIONAL',
      geometry: {
        location: { lat: 40.0, lng: -80.0 }
      }
    };
    
    const result = calculateMEOScore('Established Business', 'Test City, ST', mockPlace);
    
    console.log('\n=== TEST: No Cap for Established Business ===');
    console.log(`Input: 4.8★ rating, 200 reviews`);
    console.log(`Output: Score=${result.body.meoScore}, Cap Applied=${result.body.scoringBreakdown.reviewReliabilityCapApplied}`);
    
    // No cap should be applied
    expect(result.body.scoringBreakdown.reviewReliabilityCapApplied).toBe(false);
    expect(result.body.scoringBreakdown.reviewReliabilityCap).toBeNull();
    
    // Score can be higher
    expect(result.body.meoScore).toBeGreaterThan(70);
    
    // Confidence should be higher
    expect(['medium-high', 'high']).toContain(result.body.confidence);
  });
  
  it('Verify cap tiers: 25, 60, 150 reviews', () => {
    const testCases = [
      { reviews: 15, expectedCap: 60, expectedCapApplied: true },
      { reviews: 50, expectedCap: 70, expectedCapApplied: true },
      { reviews: 100, expectedCap: 80, expectedCapApplied: true },
      { reviews: 200, expectedCap: null, expectedCapApplied: false }
    ];
    
    testCases.forEach(({ reviews, expectedCap, expectedCapApplied }) => {
      const mockPlace: PlaceDetails = {
        place_id: `test_${reviews}_reviews`,
        name: 'Test Business',
        formatted_address: 'Test Address',
        rating: 5.0,
        user_ratings_total: reviews,
        photos: Array(10).fill({ photo_reference: 'ref' }),
        formatted_phone_number: '(555) 555-5555',
        website: 'https://example.com',
        opening_hours: { weekday_text: ['Mon: 9-5'] },
        types: ['establishment'],
        business_status: 'OPERATIONAL',
        geometry: { location: { lat: 40, lng: -80 } }
      };
      
      const result = calculateMEOScore('Test Business', 'Test City', mockPlace);
      
      expect(result.body.scoringBreakdown.reviewReliabilityCapApplied).toBe(expectedCapApplied);
      expect(result.body.scoringBreakdown.reviewReliabilityCap).toBe(expectedCap);
      
      if (expectedCapApplied && expectedCap) {
        expect(result.body.meoScore).toBeLessThanOrEqual(expectedCap);
      }
    });
  });
});





