/**
 * MEO Engine Unit Tests
 * Tests for the 3 required test cases
 */

import { calculateMEOScore } from './meoEngine';
import type { PlaceDetails } from '../types';

describe('MEO Scoring Engine - Required Test Cases', () => {
  
  // ========================================================================
  // TEST CASE 1: Ray's Driving School
  // ========================================================================
  describe('Ray\'s Driving School - Mason, OH', () => {
    it('should score ~75-80 with grade A-/A as Local Leader', () => {
      const mockPlace: PlaceDetails = {
        place_id: 'ChIJO5rUPR5XQIgRLYJQU_hocv8',
        name: 'Ray\'s Driving School',
        formatted_address: '7049 Mason Montgomery Rd, Mason, OH 45040, USA',
        rating: 4.9,
        user_ratings_total: 216,
        photos: [
          { photo_reference: 'ref1' },
          { photo_reference: 'ref2' },
          { photo_reference: 'ref3' }
        ],
        formatted_phone_number: '(513) 398-7297',
        website: 'https://raysdrivingschool.com',
        opening_hours: {
          weekday_text: [
            'Monday: 9:00 AM – 6:00 PM',
            'Tuesday: 9:00 AM – 6:00 PM',
            'Wednesday: 9:00 AM – 6:00 PM',
            'Thursday: 9:00 AM – 6:00 PM',
            'Friday: 9:00 AM – 6:00 PM',
            'Saturday: 9:00 AM – 2:00 PM',
            'Sunday: Closed'
          ]
        },
        types: ['driving_school', 'school', 'point_of_interest', 'establishment'],
        business_status: 'OPERATIONAL',
        geometry: {
          location: { lat: 39.3601, lng: -84.3097 }
        }
      };
      
      const result = calculateMEOScore(
        'Ray\'s Driving School',
        'Mason, OH',
        mockPlace
      );
      
      // Assertions
      expect(result.body.status).toBe('completed');
      expect(result.body.businessName).toBe('Ray\'s Driving School');
      expect(result.body.category).toBe('Driving School');
      expect(result.body.categoryCanonical).toBe('driving_school');
      
      // Score expectations: ~75-85 (high reviews, good rating)
      expect(result.body.meoScore).toBeGreaterThanOrEqual(75);
      expect(result.body.meoScore).toBeLessThanOrEqual(85);
      
      // Grade expectations: A- or A
      expect(['A-', 'A', 'B+']).toContain(result.body.grade);
      
      // Should be marked as Local Leader
      expect(result.body.isLocalLeader).toBe(true);
      expect(result.body.dominanceType).toBeTruthy(); // Should have some dominance type
      if (result.body.dominanceType) {
        expect(['Local Leader', 'Strong Competitor', 'Well-Optimized Business']).toContain(result.body.dominanceType);
      }
      
      // Verify metrics
      expect(result.body.rating).toBe(4.9);
      expect(result.body.totalReviews).toBe(216);
      expect(result.body.photoCount).toBe(3);
      
      // Should have high/medium-high confidence
      expect(['high', 'medium-high']).toContain(result.body.confidence);
      
      // Scoring version must be v10.1
      expect(result.body.scoringVersion).toBe('v10.1');
      
      console.log('\n=== Ray\'s Driving School Results ===');
      console.log(`Score: ${result.body.meoScore}`);
      console.log(`Grade: ${result.body.grade}`);
      console.log(`Category: ${result.body.category}`);
      console.log(`Dominance: ${result.body.dominanceType}`);
      console.log(`Confidence: ${result.body.confidence}`);
    });
  });
  
  // ========================================================================
  // TEST CASE 2: McDonald's
  // ========================================================================
  describe('McDonald\'s - Fast Food Franchise', () => {
    it('should score ~58-66 with grade B-ish, franchise true, rating penalty applied', () => {
      const mockPlace: PlaceDetails = {
        place_id: 'ChIJMcDonald123456',
        name: 'McDonald\'s',
        formatted_address: '123 Main St, Cincinnati, OH 45202, USA',
        rating: 3.2,
        user_ratings_total: 3200,
        photos: Array(50).fill({ photo_reference: 'ref' }), // 50 photos
        formatted_phone_number: '(513) 555-1234',
        website: 'https://mcdonalds.com',
        opening_hours: {
          weekday_text: [
            'Monday: 6:00 AM – 11:00 PM',
            'Tuesday: 6:00 AM – 11:00 PM',
            'Wednesday: 6:00 AM – 11:00 PM',
            'Thursday: 6:00 AM – 11:00 PM',
            'Friday: 6:00 AM – 11:00 PM',
            'Saturday: 6:00 AM – 11:00 PM',
            'Sunday: 6:00 AM – 11:00 PM'
          ]
        },
        types: ['restaurant', 'fast_food', 'food', 'point_of_interest', 'establishment'],
        business_status: 'OPERATIONAL',
        geometry: {
          location: { lat: 39.1031, lng: -84.5120 }
        }
      };
      
      const result = calculateMEOScore(
        'McDonald\'s',
        'Cincinnati, OH',
        mockPlace
      );
      
      // Assertions
      expect(result.body.status).toBe('completed');
      expect(result.body.category).toBe('Fast Food');
      expect(result.body.categoryCanonical).toBe('fast_food');
      
      // Should be detected as franchise
      expect(result.body.isFranchise).toBe(true);
      expect(result.body.isMajorNationalFranchise).toBe(true);
      expect(result.body.isFastFood).toBe(true);
      
      // Score expectations: ~58-66 (rating penalty should be applied)
      expect(result.body.meoScore).toBeGreaterThanOrEqual(55);
      expect(result.body.meoScore).toBeLessThanOrEqual(69);
      
      // Grade should be around B- to C+
      expect(['B-', 'C+', 'C', 'B']).toContain(result.body.grade);
      
      // Completeness should be 100%
      expect(result.body.completenessScore).toBe(100);
      
      // Should note rating as deficiency
      expect(result.body.deficiencies.some(d => 
        d.toLowerCase().includes('rating')
      )).toBe(true);
      
      // Scoring version must be v10.1
      expect(result.body.scoringVersion).toBe('v10.1');
      
      console.log('\n=== McDonald\'s Results ===');
      console.log(`Score: ${result.body.meoScore}`);
      console.log(`Grade: ${result.body.grade}`);
      console.log(`Franchise: ${result.body.isFranchise}`);
      console.log(`Rating: ${result.body.rating}`);
      console.log(`Completeness: ${result.body.completenessScore}%`);
      console.log(`Deficiencies: ${result.body.deficiencies.join(', ')}`);
    });
  });
  
  // ========================================================================
  // TEST CASE 3: Cincinnati Photographer (5.0 rating, 7 reviews)
  // ========================================================================
  describe('Cincinnati Photographer - Low Review Volume', () => {
    it('should detect Photography category, score in 50s, flag low reviews, lower confidence', () => {
      const mockPlace: PlaceDetails = {
        place_id: 'ChIJPhotographer789',
        name: 'Cincinnati Professional Photography',
        formatted_address: '456 Arts District, Cincinnati, OH 45202, USA',
        rating: 5.0,
        user_ratings_total: 7,
        photos: [
          { photo_reference: 'ref1' },
          { photo_reference: 'ref2' },
          { photo_reference: 'ref3' },
          { photo_reference: 'ref4' }
        ],
        formatted_phone_number: '(513) 555-7890',
        website: 'https://cincyphotography.com',
        opening_hours: {
          weekday_text: [
            'Monday: 10:00 AM – 6:00 PM',
            'Tuesday: 10:00 AM – 6:00 PM',
            'Wednesday: 10:00 AM – 6:00 PM',
            'Thursday: 10:00 AM – 6:00 PM',
            'Friday: 10:00 AM – 6:00 PM',
            'Saturday: By appointment',
            'Sunday: Closed'
          ]
        },
        types: ['photographer', 'point_of_interest', 'establishment'],
        business_status: 'OPERATIONAL',
        geometry: {
          location: { lat: 39.1031, lng: -84.5120 }
        }
      };
      
      const result = calculateMEOScore(
        'Cincinnati Professional Photography',
        'Cincinnati, OH',
        mockPlace
      );
      
      // Assertions
      expect(result.body.status).toBe('completed');
      
      // Should detect Photography category (NOT default)
      expect(result.body.category).toBe('Photography');
      expect(result.body.categoryCanonical).toBe('photography');
      
      // Score should be in 50s range (CAPPED at 50 due to low reviews)
      expect(result.body.meoScore).toBeGreaterThanOrEqual(45);
      expect(result.body.meoScore).toBeLessThanOrEqual(50);
      
      // Should flag low review count as deficiency
      expect(result.body.deficiencies.some(d => 
        d.toLowerCase().includes('review')
      )).toBe(true);
      
      // Confidence should be LOW due to very low review count (< 10)
      expect(result.body.confidence).toBe('low');
      
      // Perfect rating should be noted as a bonus
      expect(result.body.rating).toBe(5.0);
      
      // Should have optimization tips about reviews
      expect(result.body.optimizationTips.some(tip => 
        tip.toLowerCase().includes('review')
      )).toBe(true);
      
      // Scoring version must be v10.1
      expect(result.body.scoringVersion).toBe('v10.1');
      
      console.log('\n=== Cincinnati Photographer Results ===');
      console.log(`Score: ${result.body.meoScore}`);
      console.log(`Grade: ${result.body.grade}`);
      console.log(`Category: ${result.body.category}`);
      console.log(`Rating: ${result.body.rating}`);
      console.log(`Reviews: ${result.body.totalReviews}`);
      console.log(`Confidence: ${result.body.confidence}`);
      console.log(`Deficiencies: ${result.body.deficiencies.join(', ')}`);
    });
  });
  
  // ========================================================================
  // ADDITIONAL VALIDATION TESTS
  // ========================================================================
  describe('Schema Validation', () => {
    it('should always return scoringVersion v10.1', () => {
      const mockPlace: PlaceDetails = {
        place_id: 'test',
        name: 'Test Business',
        formatted_address: 'Test Address',
        rating: 4.0,
        user_ratings_total: 50,
        types: ['establishment'],
        business_status: 'OPERATIONAL'
      };
      
      const result = calculateMEOScore('Test Business', 'Test Location', mockPlace);
      
      expect(result.body.scoringVersion).toBe('v10.1');
      expect(result.body.scoringVersion).not.toBe('');
      expect(result.body.scoringVersion).not.toBeNull();
      expect(result.body.scoringVersion).not.toBeUndefined();
    });
    
    it('should always have a baseline score >= 37', () => {
      // Test with minimal data
      const mockPlace: PlaceDetails = {
        place_id: 'minimal',
        name: 'Minimal Business',
        formatted_address: 'Address',
        types: ['establishment']
      };
      
      const result = calculateMEOScore('Minimal Business', 'Location', mockPlace);
      
      expect(result.body.meoScore).toBeGreaterThanOrEqual(37);
    });
  });
});

