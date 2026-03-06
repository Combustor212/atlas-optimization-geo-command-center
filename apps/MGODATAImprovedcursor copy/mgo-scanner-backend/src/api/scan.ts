/**
 * Main scan API route handler
 */
import { Request, Response } from 'express';
import { ScanRequest, ScanResponse, PlaceDetails, NAP, DirectoryCitation, GeoWebsiteAnalysis } from '../types';
import { findPlaceFromText, getPlaceDetails, placeDetailsToNAP, normalizeAddress } from '../lib/places';
import { fetchHtml } from '../lib/fetchHtml';
import { analyzeWebsiteForGeoSignals, analyzeDirectoryPageForCitation } from '../lib/openai';
import { calculateMEOScore } from '../lib/scoring/meo';
import { calculateGeoScore } from '../lib/scoring/geo';
import { calculateCombinedScore } from '../lib/scoring/combined';
import { directoryTargets, buildDirectorySearchUrl } from '../config/directories';
import { websiteCache, directoryCache } from '../lib/cache';

/**
 * Extract city from address
 */
function extractCityFromAddress(address: string): string {
  // Simple extraction: look for common patterns
  // Format: "123 Main St, City, State ZIP"
  const parts = address.split(',').map(p => p.trim());
  if (parts.length >= 2) {
    return parts[parts.length - 2] || parts[0] || '';
  }
  return parts[0] || '';
}

/**
 * Check directory citations
 */
async function checkDirectoryCitations(
  nap: NAP,
  businessName: string
): Promise<DirectoryCitation[]> {
  const city = extractCityFromAddress(nap.address);
  const citations: DirectoryCitation[] = [];

  // Process directories in parallel with timeout
  const directoryPromises = directoryTargets.map(async (directory): Promise<DirectoryCitation | null> => {
    try {
      const cacheKey = `dir:${directory.name}:${businessName}:${city}`;
      const cached = directoryCache.get<DirectoryCitation>(cacheKey);
      if (cached) {
        return { ...cached, directory: directory.name };
      }

      const searchUrl = buildDirectorySearchUrl(directory, businessName, city);
      
      // Fetch with timeout
      const html = await fetchHtml(searchUrl, { timeout: 8000, retries: 1 });
      
      // Analyze with OpenAI
      const analysis = await analyzeDirectoryPageForCitation(html, nap);
      analysis.directory = directory.name;

      // Cache result
      directoryCache.set(cacheKey, analysis, 1000 * 60 * 60 * 6);

      return analysis;
    } catch (error: any) {
      console.error(`Directory check failed for ${directory.name}:`, error.message);
      // Return missing citation instead of failing
      return {
        directory: directory.name,
        best_listing_url: null,
        extracted_nap: null,
        match_quality: 'missing'
      };
    }
  });

  const results = await Promise.allSettled(directoryPromises);
  
  for (const result of results) {
    if (result.status === 'fulfilled' && result.value) {
      citations.push(result.value);
    } else {
      // Add missing citation for failed directory
      const directory = directoryTargets[citations.length];
      if (directory) {
        citations.push({
          directory: directory.name,
          best_listing_url: null,
          extracted_nap: null,
          match_quality: 'missing'
        });
      }
    }
  }

  return citations;
}

/**
 * Check website for GEO signals
 */
async function checkWebsite(
  websiteUrl: string,
  nap: NAP
): Promise<GeoWebsiteAnalysis | null> {
  try {
    const cacheKey = `website:${websiteUrl}`;
    const cached = websiteCache.get<GeoWebsiteAnalysis>(cacheKey);
    if (cached) {
      return cached;
    }

    // Fetch homepage
    const html = await fetchHtml(websiteUrl, { timeout: 8000, retries: 1 });
    
    // Analyze with OpenAI
    const analysis = await analyzeWebsiteForGeoSignals(html, nap);

    // Cache result
    websiteCache.set(cacheKey, analysis, 1000 * 60 * 60 * 6);

    return analysis;
  } catch (error: any) {
    console.error('Website check failed:', error.message);
    return null;
  }
}

/**
 * Main scan handler
 */
export async function handleScan(req: Request, res: Response): Promise<void> {
  const startTime = Date.now();
  const timing = {
    places_fetch_ms: 0,
    website_fetch_ms: 0,
    meo_calculation_ms: 0,
    geo_calculation_ms: 0,
    total_ms: 0
  };

  try {
    const body: ScanRequest = req.body;
    let placeId: string | null = null;
    let placeDetails: PlaceDetails | null = null;

    // Step 1: Resolve placeId
    const placesStart = Date.now();
    if (body.placeId) {
      placeId = body.placeId;
    } else if (body.query) {
      placeId = await findPlaceFromText(body.query);
      if (!placeId) {
        res.status(404).json({ error: 'No place found for query' });
        return;
      }
    } else {
      res.status(400).json({ error: 'Either placeId or query must be provided' });
      return;
    }

    // Step 2: Get place details
    placeDetails = await getPlaceDetails(placeId);
    timing.places_fetch_ms = Date.now() - placesStart;

    // Step 3: Normalize to NAP
    const nap = placeDetailsToNAP(placeDetails);
    if (body.websiteOverride) {
      nap.website = body.websiteOverride;
    }

    // Step 4: Calculate MEO score
    const meoStart = Date.now();
    const meoScore = calculateMEOScore(placeDetails);
    timing.meo_calculation_ms = Date.now() - meoStart;

    // Step 5: Check website and directories (parallel)
    const geoStart = Date.now();
    const [websiteAnalysis, directoryCitations] = await Promise.all([
      nap.website ? checkWebsite(nap.website, nap) : Promise.resolve(null),
      checkDirectoryCitations(nap, placeDetails.name)
    ]);
    timing.website_fetch_ms = Date.now() - geoStart;

    // Step 6: Calculate GEO score
    const geoScore = calculateGeoScore(websiteAnalysis, directoryCitations);
    timing.geo_calculation_ms = Date.now() - geoStart;

    // Step 7: Calculate combined score
    const combinedScore = calculateCombinedScore(meoScore.score, geoScore.score);

    // Step 8: Build response
    timing.total_ms = Date.now() - startTime;

    const response: ScanResponse = {
      place: nap,
      scores: {
        meo: meoScore,
        geo: geoScore,
        combined: combinedScore
      },
      checks: {
        directories: directoryCitations,
        website: websiteAnalysis
      },
      timing
    };

    res.json(response);
  } catch (error: any) {
    console.error('Scan error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
}

