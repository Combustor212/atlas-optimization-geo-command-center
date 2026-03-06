/**
 * GEO Scoring Tests
 */

import { calculateGEOScore } from './geoScoring';
import type { GEOCandidate, QueryRankResult } from './geoSchema';

describe('GEO Scoring', () => {
  const mockTarget: GEOCandidate = {
    placeId: 'target_place_id',
    name: 'Target Business',
    address: '123 Main St',
    lat: 40.0,
    lng: -80.0,
    distanceMeters: 0,
    rating: 4.5,
    reviewCount: 100,
    photoCount: 20,
    hasWebsite: true,
    hasPhone: true,
    hasHours: true,
    types: ['restaurant']
  };

  const mockCompetitors: GEOCandidate[] = [
    {
      placeId: 'comp1',
      name: 'Competitor 1',
      address: '456 Oak Ave',
      lat: 40.01,
      lng: -80.01,
      distanceMeters: 1000,
      rating: 4.2,
      reviewCount: 80,
      photoCount: 15,
      hasWebsite: true,
      hasPhone: true,
      hasHours: true,
      types: ['restaurant']
    },
    {
      placeId: 'comp2',
      name: 'Competitor 2',
      address: '789 Pine Rd',
      lat: 40.02,
      lng: -80.02,
      distanceMeters: 1500,
      rating: 4.0,
      reviewCount: 60,
      photoCount: 10,
      hasWebsite: false,
      hasPhone: true,
      hasHours: false,
      types: ['restaurant']
    },
    {
      placeId: 'comp3',
      name: 'Competitor 3',
      address: '321 Elm St',
      lat: 40.03,
      lng: -80.03,
      distanceMeters: 2000,
      rating: 4.8,
      reviewCount: 150,
      photoCount: 30,
      hasWebsite: true,
      hasPhone: true,
      hasHours: true,
      types: ['restaurant']
    }
  ];

  const mockRankResults: QueryRankResult[] = [
    {
      query: 'best restaurant near me',
      bucket: 'best',
      weight: 1.0,
      top5: [
        { placeId: 'comp3', rank: 1, reasons: ['High rating'], weaknesses: [] },
        { placeId: 'target_place_id', rank: 2, reasons: ['Good reviews'], weaknesses: [] },
        { placeId: 'comp1', rank: 3, reasons: ['Solid rating'], weaknesses: [] }
      ],
      confidence: 0.9,
      missingDataFlags: [],
      auditPassed: true
    },
    {
      query: 'cheap restaurant',
      bucket: 'cheap',
      weight: 0.85,
      top5: [
        { placeId: 'target_place_id', rank: 1, reasons: ['Good value'], weaknesses: [] },
        { placeId: 'comp2', rank: 2, reasons: ['Affordable'], weaknesses: [] },
        { placeId: 'comp1', rank: 3, reasons: ['Budget-friendly'], weaknesses: [] }
      ],
      confidence: 0.8,
      missingDataFlags: [],
      auditPassed: true
    },
    {
      query: 'restaurant open now',
      bucket: 'open_now',
      weight: 0.9,
      top5: [
        { placeId: 'comp3', rank: 1, reasons: ['Open'], weaknesses: [] },
        { placeId: 'comp1', rank: 2, reasons: ['Open'], weaknesses: [] },
        { placeId: 'target_place_id', rank: 3, reasons: ['Open'], weaknesses: [] }
      ],
      confidence: 0.85,
      missingDataFlags: [],
      auditPassed: true
    }
  ];

  test('calculates GEO score correctly', () => {
    const result = calculateGEOScore(
      'target_place_id',
      mockTarget,
      mockCompetitors,
      mockRankResults
    );

    expect(result.geoScore).toBeGreaterThan(0);
    expect(result.geoScore).toBeLessThanOrEqual(100);
    expect(result.percentile).toBeGreaterThanOrEqual(0);
    expect(result.percentile).toBeLessThanOrEqual(100);
  });

  test('calculates SOV correctly', () => {
    const result = calculateGEOScore(
      'target_place_id',
      mockTarget,
      mockCompetitors,
      mockRankResults
    );

    // Target ranks in top 3 for 3/3 queries
    expect(result.scoreBreakdown.sovTop3).toBeGreaterThan(0);
    expect(result.scoreBreakdown.sovTop5).toBeGreaterThan(0);
  });

  test('generates drivers based on competitor medians', () => {
    const result = calculateGEOScore(
      'target_place_id',
      mockTarget,
      mockCompetitors,
      mockRankResults
    );

    expect(result.drivers).toBeDefined();
    expect(Array.isArray(result.drivers)).toBe(true);
    
    // Should have drivers for gaps
    if (result.drivers.length > 0) {
      const driver = result.drivers[0];
      expect(driver).toHaveProperty('id');
      expect(driver).toHaveProperty('title');
      expect(driver).toHaveProperty('status');
      expect(driver).toHaveProperty('pointGain');
    }
  });

  test('extracts top wins and losses', () => {
    const result = calculateGEOScore(
      'target_place_id',
      mockTarget,
      mockCompetitors,
      mockRankResults
    );

    expect(result.topQueryWins).toBeDefined();
    expect(result.topQueryLosses).toBeDefined();
    expect(Array.isArray(result.topQueryWins)).toBe(true);
    expect(Array.isArray(result.topQueryLosses)).toBe(true);
  });

  test('generates fix-first actions from drivers', () => {
    const result = calculateGEOScore(
      'target_place_id',
      mockTarget,
      mockCompetitors,
      mockRankResults
    );

    expect(result.fixFirst).toBeDefined();
    expect(Array.isArray(result.fixFirst)).toBe(true);
    expect(result.fixFirst.length).toBeLessThanOrEqual(3);

    if (result.fixFirst.length > 0) {
      const action = result.fixFirst[0];
      expect(action).toHaveProperty('id');
      expect(action).toHaveProperty('title');
      expect(action).toHaveProperty('pointGain');
      expect(action).toHaveProperty('timeEstimate');
    }
  });

  test('handles business with no rankings', () => {
    const emptyRankResults: QueryRankResult[] = [
      {
        query: 'test query',
        bucket: 'best',
        weight: 1.0,
        top5: [
          { placeId: 'comp1', rank: 1, reasons: [], weaknesses: [] },
          { placeId: 'comp2', rank: 2, reasons: [], weaknesses: [] }
        ],
        confidence: 0.9,
        missingDataFlags: [],
        auditPassed: true
      }
    ];

    const result = calculateGEOScore(
      'target_place_id',
      mockTarget,
      mockCompetitors,
      emptyRankResults
    );

    expect(result.geoScore).toBeGreaterThanOrEqual(0);
    expect(result.scoreBreakdown.sovTop3).toBe(0);
    expect(result.scoreBreakdown.sovTop5).toBe(0);
  });

  test('handles business with perfect rankings', () => {
    const perfectRankResults: QueryRankResult[] = [
      {
        query: 'query 1',
        bucket: 'best',
        weight: 1.0,
        top5: [
          { placeId: 'target_place_id', rank: 1, reasons: [], weaknesses: [] }
        ],
        confidence: 1.0,
        missingDataFlags: [],
        auditPassed: true
      },
      {
        query: 'query 2',
        bucket: 'high_intent',
        weight: 1.3,
        top5: [
          { placeId: 'target_place_id', rank: 1, reasons: [], weaknesses: [] }
        ],
        confidence: 1.0,
        missingDataFlags: [],
        auditPassed: true
      }
    ];

    const result = calculateGEOScore(
      'target_place_id',
      mockTarget,
      mockCompetitors,
      perfectRankResults
    );

    expect(result.geoScore).toBeGreaterThan(80); // Should be high
    expect(result.scoreBreakdown.sovTop3).toBe(1.0); // 100% SOV
  });
});




