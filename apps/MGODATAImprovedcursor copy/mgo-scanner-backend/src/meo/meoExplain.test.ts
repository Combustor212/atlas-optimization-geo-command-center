import { buildMEOExplainData } from './meoExplain';

describe('buildMEOExplainData', () => {
  test('does not output photoCount=0 when photos exist', () => {
    const place: any = {
      place_id: 'place_123',
      name: 'Test Biz',
      formatted_address: '123 Main St, City, ST',
      rating: 4.8,
      user_ratings_total: 57,
      photos: [{ photo_reference: 'a' }, { photo_reference: 'b' }, { photo_reference: 'c' }],
      types: ['restaurant'],
    };

    const meo: any = {
      businessName: 'Test Biz',
      address: '123 Main St, City, ST',
      meoScore: 70,
      gbpFacts: {
        rating: 4.8,
        totalReviews: 57,
        photoCount: 0, // UI must NOT show this if photos exist in Place Details
        hasWebsite: true,
        hasPhone: true,
        hasHours: false,
        hasDescription: false,
      },
      meoBreakdown: {
        wasCapped: false,
        reviewReliabilityCapApplied: false,
        reviewReliabilityCap: null,
        capReason: null,
        rawScore: 70,
        rawScoreBeforeCap: null,
        finalScore: 70,
        components: {
          photos: { points: 2, maxPoints: 10 },
          engagement: { points: 1, maxPoints: 8 },
          profile: { points: 6, maxPoints: 16 },
          hours: { points: 0, maxPoints: 5 },
          description: { points: 0, maxPoints: 5 },
          website: { points: 5, maxPoints: 5 },
        },
      },
    };

    const explain = buildMEOExplainData({ place, meo, ownerReplyRateSource: 'unavailable' });
    expect(explain.placeId).toBe('place_123');
    expect(explain.photoCount).toBeGreaterThan(0);
    expect(explain.photoCount).toBe(3);
    expect(explain.photoCountMayBeLimited).toBe(true);
  });

  test('includes reliability cap driver when capped', () => {
    const place: any = {
      place_id: 'place_abc',
      name: 'Tiny Biz',
      formatted_address: '1 Small St, City, ST',
      rating: 5.0,
      user_ratings_total: 7,
      photos: [{ photo_reference: 'a' }],
    };

    const meo: any = {
      businessName: 'Tiny Biz',
      meoScore: 50,
      gbpFacts: {
        rating: 5.0,
        totalReviews: 7,
        photoCount: 1,
        hasWebsite: false,
        hasPhone: true,
        hasHours: true,
        hasDescription: true,
      },
      scoringBreakdown: {
        wasCapped: true,
        reviewReliabilityCapApplied: true,
        reviewReliabilityCap: 50,
        capReason: 'Only 7 reviews. Score capped at 50 until you reach 10 reviews.',
        rawScore: 50,
        rawScoreBeforeCap: 78,
        finalScore: 50,
        components: { photos: { points: 1, maxPoints: 10 } },
      },
    };

    const explain = buildMEOExplainData({ place, meo, ownerReplyRateSource: 'unavailable' });
    expect(explain.reliabilityCap.enabled).toBe(true);
    expect(explain.reliabilityCap.capValue).toBe(50);
    expect(explain.drivers.find((d) => d.id === 'reliability_cap')).toBeTruthy();
  });
});


