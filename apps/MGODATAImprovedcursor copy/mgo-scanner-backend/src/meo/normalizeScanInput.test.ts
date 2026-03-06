/**
 * Input Normalization Tests
 * Tests all 3 input formats
 */

import { normalizeScanInput, validateNormalizedInput } from './normalizeScanInput';
import type { ScanInput, NormalizedScanInput } from './meoSchema';

describe('Input Normalization', () => {
  
  // ========================================================================
  // FORMAT A: Manual Input
  // ========================================================================
  describe('Format A: Manual Input', () => {
    it('should normalize manual input correctly', () => {
      const input: ScanInput = {
        businessName: 'Ray\'s Driving School',
        location: 'Mason, OH'
      };
      
      const result = normalizeScanInput(input);
      
      expect(result.businessName).toBe('Ray\'s Driving School');
      expect(result.location).toBe('Mason, OH');
      expect(result.place_id).toBeUndefined();
    });
    
    it('should clean whitespace and special characters', () => {
      const input: ScanInput = {
        businessName: '  Test   Business  \n\t',
        location: '\n  City,   State  \r\n'
      };
      
      const result = normalizeScanInput(input);
      
      expect(result.businessName).toBe('Test Business');
      expect(result.location).toBe('City, State');
    });
  });
  
  // ========================================================================
  // FORMAT B: Google Dropdown/Autocomplete
  // ========================================================================
  describe('Format B: Google Dropdown/Autocomplete', () => {
    it('should parse Ray\'s Driving School from dropdown format', () => {
      const input: ScanInput = {
        selectedPlace: {
          description: 'Ray\'s Driving School, 7049 Mason Montgomery Rd, Mason, OH 45040, USA',
          place_id: 'ChIJO5rUPR5XQIgRLYJQU_hocv8',
          structured_formatting: {
            main_text: 'Ray\'s Driving School',
            secondary_text: '7049 Mason Montgomery Rd, Mason, OH 45040, USA'
          },
          terms: []
        }
      };
      
      const result = normalizeScanInput(input);
      
      expect(result.businessName).toBe('Ray\'s Driving School');
      expect(result.location).toBe('Mason, OH');
      expect(result.place_id).toBe('ChIJO5rUPR5XQIgRLYJQU_hocv8');
    });
    
    it('should extract city/state from full address', () => {
      const input: ScanInput = {
        selectedPlace: {
          description: 'McDonald\'s, 123 Main St, Cincinnati, OH 45202, USA',
          place_id: 'ChIJTest123',
          structured_formatting: {},
          terms: []
        }
      };
      
      const result = normalizeScanInput(input);
      
      expect(result.businessName).toBe('McDonald\'s');
      expect(result.location).toBe('Cincinnati, OH');
      expect(result.place_id).toBe('ChIJTest123');
    });
    
    it('should handle dropdown with multiple address parts', () => {
      const input: ScanInput = {
        selectedPlace: {
          description: 'Starbucks Coffee, 456 Oak Avenue, Downtown, Portland, OR 97201, United States',
          place_id: 'ChIJStarbucks',
          structured_formatting: {},
          terms: []
        }
      };
      
      const result = normalizeScanInput(input);
      
      expect(result.businessName).toBe('Starbucks Coffee');
      // Should extract city and state from the address
      expect(result.location).toContain('Portland');
      expect(result.place_id).toBe('ChIJStarbucks');
    });
  });
  
  // ========================================================================
  // FORMAT C: Logged-in with place_id
  // ========================================================================
  describe('Format C: Logged-in with place_id', () => {
    it('should normalize logged-in format correctly', () => {
      const input: ScanInput = {
        businessName: 'Ray\'s Driving School',
        place_id: 'ChIJO5rUPR5XQIgRLYJQU_hocv8',
        location: 'Mason, OH'
      };
      
      const result = normalizeScanInput(input);
      
      expect(result.businessName).toBe('Ray\'s Driving School');
      expect(result.location).toBe('Mason, OH');
      expect(result.place_id).toBe('ChIJO5rUPR5XQIgRLYJQU_hocv8');
    });
    
    it('should handle logged-in format without location', () => {
      const input: ScanInput = {
        businessName: 'Test Business',
        place_id: 'ChIJTest',
        location: ''
      };
      
      const result = normalizeScanInput(input);
      
      expect(result.businessName).toBe('Test Business');
      expect(result.location).toBe('');
      expect(result.place_id).toBe('ChIJTest');
    });
  });
  
  // ========================================================================
  // VALIDATION
  // ========================================================================
  describe('Validation', () => {
    it('should validate correct input', () => {
      const input: NormalizedScanInput = {
        businessName: 'Test Business',
        location: 'Test City'
      };
      
      const errors = validateNormalizedInput(input);
      
      expect(errors).toEqual([]);
    });
    
    it('should reject missing business name', () => {
      const input: NormalizedScanInput = {
        businessName: '',
        location: 'Test City'
      };
      
      const errors = validateNormalizedInput(input);
      
      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some(e => e.includes('Business name'))).toBe(true);
    });
    
    it('should reject missing location', () => {
      const input: NormalizedScanInput = {
        businessName: 'Test Business',
        location: ''
      };
      
      const errors = validateNormalizedInput(input);
      
      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some(e => e.includes('Location'))).toBe(true);
    });
    
    it('should reject too short inputs', () => {
      const input: NormalizedScanInput = {
        businessName: 'A',
        location: 'B'
      };
      
      const errors = validateNormalizedInput(input);
      
      expect(errors.length).toBeGreaterThan(0);
    });
  });
  
  // ========================================================================
  // EDGE CASES
  // ========================================================================
  describe('Edge Cases', () => {
    it('should handle quotes in business names', () => {
      const input: ScanInput = {
        businessName: 'Joe\'s "Best" Pizza',
        location: 'New York, NY'
      };
      
      const result = normalizeScanInput(input);
      
      expect(result.businessName).toContain('Joe');
      expect(result.businessName).toContain('Pizza');
    });
    
    it('should handle special characters', () => {
      const input: ScanInput = {
        businessName: 'Café & Bakery™',
        location: 'San José, CA'
      };
      
      const result = normalizeScanInput(input);
      
      expect(result.businessName.length).toBeGreaterThan(0);
      expect(result.location.length).toBeGreaterThan(0);
    });
    
    it('should handle very long addresses', () => {
      const input: ScanInput = {
        selectedPlace: {
          description: 'Business Name, Building 5, Suite 200, 12345 Very Long Street Name Boulevard, City Name, State 12345-6789, United States of America',
          place_id: 'ChIJLong',
          structured_formatting: {},
          terms: []
        }
      };
      
      const result = normalizeScanInput(input);
      
      expect(result.businessName).toBe('Business Name');
      expect(result.location.length).toBeGreaterThan(0);
      expect(result.place_id).toBe('ChIJLong');
    });
  });
});





