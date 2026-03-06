/**
 * Unit tests for GEO scoring
 */
import { calculateGeoScore } from './geo';
import { GeoWebsiteAnalysis, DirectoryCitation } from '../../types';

describe('GEO Scoring', () => {
  const mockNAP = {
    name: 'Test Business',
    address: '123 Main St',
    phone: '+15551234567',
    website: 'https://example.com'
  };

  test('calculates perfect GEO score with all matches', () => {
    const websiteAnalysis: GeoWebsiteAnalysis = {
      found_nap: mockNAP,
      nap_match: {
        name: 'match',
        address: 'match',
        phone: 'match'
      },
      localbusiness_schema: {
        present: true,
        valid: true,
        has_nap: true,
        sameAsCount: 6
      },
      sameAs: ['https://facebook.com', 'https://twitter.com', 'https://linkedin.com', 'https://instagram.com', 'https://yelp.com', 'https://bbb.org'],
      service_area_clarity: 'clear',
      what_where_clarity: 'clear',
      faq_signals: {
        present: true,
        evidence: ['FAQ', 'Questions', 'Answers']
      }
    };

    const directoryCitations: DirectoryCitation[] = [
      {
        directory: 'Yelp',
        best_listing_url: 'https://yelp.com/biz/test',
        extracted_nap: mockNAP,
        match_quality: 'match'
      },
      {
        directory: 'BBB',
        best_listing_url: 'https://bbb.org/test',
        extracted_nap: mockNAP,
        match_quality: 'match'
      }
    ];

    const result = calculateGeoScore(websiteAnalysis, directoryCitations);
    
    expect(result.score).toBeGreaterThan(80);
    expect(result.breakdown.nap_consistency.website_nap_match).toBe(15);
    expect(result.breakdown.structured_data.localbusiness_schema).toBe(15);
    expect(result.breakdown.content_clarity.faq_signals).toBe(10);
  });

  test('handles missing website analysis', () => {
    const directoryCitations: DirectoryCitation[] = [];
    const result = calculateGeoScore(null, directoryCitations);
    
    expect(result.score).toBe(0);
    expect(result.breakdown.nap_consistency.website_nap_match).toBe(0);
  });

  test('calculates directory citations score correctly', () => {
    const websiteAnalysis: GeoWebsiteAnalysis = {
      found_nap: null,
      nap_match: {
        name: 'missing',
        address: 'missing',
        phone: 'missing'
      },
      localbusiness_schema: {
        present: false,
        valid: false,
        has_nap: false,
        sameAsCount: 0
      },
      sameAs: [],
      service_area_clarity: 'missing',
      what_where_clarity: 'missing',
      faq_signals: {
        present: false,
        evidence: []
      }
    };

    const directoryCitations: DirectoryCitation[] = [
      { directory: 'Yelp', best_listing_url: null, extracted_nap: null, match_quality: 'match' },
      { directory: 'BBB', best_listing_url: null, extracted_nap: null, match_quality: 'partial' },
      { directory: 'YellowPages', best_listing_url: null, extracted_nap: null, match_quality: 'mismatch' }
    ];

    const result = calculateGeoScore(websiteAnalysis, directoryCitations);
    
    // 2 directories: 1 match (1.0) + 1 partial (0.5) = 1.5
    // Score = 30 * (1.5 / 3) = 15
    expect(result.breakdown.nap_consistency.directory_citations).toBe(15);
  });

  test('calculates schema score correctly', () => {
    const websiteAnalysis: GeoWebsiteAnalysis = {
      found_nap: null,
      nap_match: {
        name: 'missing',
        address: 'missing',
        phone: 'missing'
      },
      localbusiness_schema: {
        present: true,
        valid: true,
        has_nap: true,
        sameAsCount: 0
      },
      sameAs: [],
      service_area_clarity: 'missing',
      what_where_clarity: 'missing',
      faq_signals: {
        present: false,
        evidence: []
      }
    };

    const result = calculateGeoScore(websiteAnalysis, []);
    expect(result.breakdown.structured_data.localbusiness_schema).toBe(15);
  });
});

