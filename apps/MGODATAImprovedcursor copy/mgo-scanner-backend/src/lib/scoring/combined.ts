/**
 * Combined Score Calculation
 */
import { CombinedScore } from '../../types';

/**
 * Calculate combined score: round(0.55 * MEO + 0.45 * GEO)
 */
export function calculateCombinedScore(meoScore: number, geoScore: number): CombinedScore {
  const score = Math.round(0.55 * meoScore + 0.45 * geoScore);
  
  return {
    score,
    formula: 'round(0.55*MEO + 0.45*GEO)'
  };
}

