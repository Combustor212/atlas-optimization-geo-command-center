// Function wrappers - replaced Base44 functions with direct API calls

import { callOpenAI, geoProfileScan as openaiGeoProfileScan } from './openaiClient';
import { getPlacesAutocomplete, getPlaceDetails, geocodeAddress, verifyPlacesApi as verifyPlacesApiFunc } from './placesClient';
import { API_BASE_URL, buildApiUrl } from '../config/api';

// Places API functions
export const placesGeocodeAPI = async (params) => {
  return await geocodeAddress(params);
};

export const placesAutocompleteAPI = async (params) => {
  return await getPlacesAutocomplete(params);
};

export const placesDetailsAPI = async (params) => {
  return await getPlaceDetails(params);
};

// OpenAI functions
export const openaiChat = async (params) => {
  return await callOpenAI(params);
};

// Geo scan function
export const geoProfileScan = async (params) => {
  return await openaiGeoProfileScan(params);
};

// Calculate MEO score based on Google Places data
function calculateMEOScore(placeDetails) {
  if (!placeDetails) return 50; // Default score if no data
  
  let score = 0;
  const maxScore = 100;
  
  // Basic information (30 points)
  if (placeDetails.name) score += 5;
  if (placeDetails.formatted_address) score += 5;
  if (placeDetails.international_phone_number || placeDetails.formatted_phone_number) score += 10;
  if (placeDetails.website) score += 10;
  
  // Reviews and rating (40 points)
  const rating = placeDetails.rating || 0;
  const reviewCount = placeDetails.user_ratings_total || 0;
  
  // Rating score (0-20 points)
  if (rating >= 4.5) score += 20;
  else if (rating >= 4.0) score += 15;
  else if (rating >= 3.5) score += 10;
  else if (rating >= 3.0) score += 5;
  
  // Review count score (0-20 points)
  if (reviewCount >= 100) score += 20;
  else if (reviewCount >= 50) score += 15;
  else if (reviewCount >= 25) score += 10;
  else if (reviewCount >= 10) score += 5;
  
  // Business status and hours (20 points)
  if (placeDetails.business_status === 'OPERATIONAL') score += 10;
  if (placeDetails.opening_hours?.weekday_text?.length > 0) score += 10;
  
  // Types/categories (10 points)
  if (placeDetails.types && placeDetails.types.length >= 3) score += 10;
  else if (placeDetails.types && placeDetails.types.length >= 1) score += 5;
  
  return Math.min(score, maxScore);
}

// Calculate percentile based on scores
function calculatePercentile(meoScore, geoScore) {
  const overallScore = (geoScore * 0.6) + (meoScore * 0.4);
  
  // Percentile calculation based on score ranges
  if (overallScore >= 90) return { percentile: 95, text: 'Top 5%' };
  if (overallScore >= 80) return { percentile: 85, text: 'Top 15%' };
  if (overallScore >= 70) return { percentile: 70, text: 'Top 30%' };
  if (overallScore >= 60) return { percentile: 50, text: 'Top 50%' };
  if (overallScore >= 50) return { percentile: 35, text: 'Top 65%' };
  if (overallScore >= 40) return { percentile: 20, text: 'Top 80%' };
  return { percentile: 10, text: 'Top 90%' };
}

// Scanner function - combines Places and OpenAI
export const scanner = async (params) => {
  try {
    const { place_id, business_name, city, state, location, country, place_data, email, phone, zipCode } = params;
    
    // Get place details - use provided place_data from Autocomplete widget
    let placeDetails = null;
    
    if (place_data) {
      // Use place data provided from Autocomplete widget (best option - no CORS issues)
      placeDetails = place_data;
    } else if (place_id && typeof window !== 'undefined' && window.google?.maps?.places?.PlacesService) {
      // Use Google Maps JavaScript API PlacesService (no CORS issues)
      return new Promise((resolve) => {
        const service = new window.google.maps.places.PlacesService(document.createElement('div'));
        service.getDetails(
          {
            placeId: place_id,
            fields: ['place_id', 'name', 'formatted_address', 'address_components', 'geometry', 'website', 'international_phone_number', 'formatted_phone_number', 'opening_hours', 'rating', 'user_ratings_total', 'types', 'business_status']
          },
          async (result, status) => {
            if (status === window.google.maps.places.PlacesServiceStatus.OK && result) {
              placeDetails = result;
            } else {
              // Fallback to minimal data
              placeDetails = {
                place_id: place_id,
                name: business_name,
                formatted_address: `${city || ''}, ${country || ''}`.trim(),
                rating: 0,
                user_ratings_total: 0
              };
            }
            
            // Continue with scan processing
            const scanResult = await processScan(placeDetails, { business_name, city, state, location, country, email, phone, zipCode });
            resolve(scanResult);
          }
        );
      });
    } else if (place_id) {
      // Last resort: try REST API (may have CORS issues)
      const detailsResult = await getPlaceDetails({ place_id });
      if (detailsResult.status === 'OK') {
        placeDetails = detailsResult.result;
      } else {
        console.warn('Places API error:', detailsResult.error_message || detailsResult.status);
        // Continue with minimal data if API fails
        placeDetails = {
          place_id: place_id,
          name: business_name,
          formatted_address: `${city || ''}, ${country || ''}`.trim(),
          rating: 0,
          user_ratings_total: 0
        };
      }
    }
    
    if (!placeDetails) {
      return {
        success: false,
        error: 'Could not fetch business details from Google Places'
      };
    }
    
    return await processScan(placeDetails, { business_name, city, state, location, country, email, phone, zipCode });
  } catch (error) {
    console.error('Scanner error:', error);
    return {
      success: false,
      error: error.message || 'Scan failed'
    };
  }
};

// Process scan with place details
async function processScan(placeDetails, { business_name, city, state, location, country, email, phone, zipCode }) {
    
  // ============================================================================
  // CALL BACKEND API - Single Source of Truth for MEO Scoring
  // ============================================================================
  
  try {
    // Call our backend MEO scan API (with no-cache to always get fresh data)
    // In dev use proxy (buildApiUrl → relative /api/meo/scan) so response isn't blocked by CORS
    const scanUrl = buildApiUrl('/api/meo/scan');
    if (import.meta.env.DEV) {
      console.log('[Scanner] POST', scanUrl || '/api/meo/scan', '(same-origin → Vite proxy → backend)');
    }
    const response = await fetch(scanUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      cache: 'no-store', // ALWAYS fetch fresh data, never use cached response
      body: JSON.stringify({
        businessName: business_name || placeDetails.name,
        location: `${city || location || ''}, ${state || ''}`.trim(),
        place_id: placeDetails.place_id,
        email: email || undefined,
        phone: phone || undefined,
        state: state || undefined,
        city: city || undefined,
        zipCode: zipCode || undefined,
        country: country || undefined,
        address: placeDetails.formatted_address || placeDetails.formattedAddress || undefined,
      })
    });
    
    if (!response.ok) {
      throw new Error(`Backend API error: ${response.status}`);
    }
    
    const scanResult = await response.json();
    
    // ✅ Canonical GEO object (single source of truth)
    const meoScore = typeof scanResult?.scores?.meo === 'number' ? scanResult.scores.meo : 0;
    let seoScore = typeof scanResult?.scores?.seo === 'number' ? scanResult.scores.seo : null;
    // Fallback: if backend returns null SEO, compute from place profile (completeness-based)
    // Cap at 75 — we couldn't measure actual search visibility, so avoid inflating
    if (seoScore === null && placeDetails) {
      const hasWebsite = !!(placeDetails.website || placeDetails.websiteUri);
      const hasDescription = !!(placeDetails.editorial_summary?.overview || placeDetails.editorialSummary?.text);
      const hasHours = !!(placeDetails.opening_hours);
      const hasPhone = !!(placeDetails.formatted_phone_number || placeDetails.international_phone_number);
      const gbpFacts = scanResult?.body?.gbpFacts || scanResult?.body?.meoInputsUsed;
      let fallbackSeo = 35;
      if (hasWebsite) fallbackSeo += 25;
      if (hasDescription) fallbackSeo += 15;
      if (hasHours) fallbackSeo += 8;
      if (hasPhone) fallbackSeo += 7;
      if (gbpFacts?.completenessScore) fallbackSeo += Math.min(25, Math.round((gbpFacts.completenessScore / 100) * 25));
      seoScore = Math.min(75, Math.round(fallbackSeo));
    }
    const geo = scanResult?.geo || null;
    const overallScore = typeof scanResult?.scores?.overall === 'number' ? scanResult.scores.overall : (typeof scanResult?.scores?.final === 'number' ? scanResult.scores.final : null);
    const meoData = scanResult.body;

    // 🔍 DEBUG: Log full backend response and prove path
    console.log('═══════════════════════════════════════════════════════');
    console.log('🔍 [Scanner] UNIFIED SCAN RESPONSE (MEO + GEO):');
    console.log('═══════════════════════════════════════════════════════');
    console.log('Backend Path:', scanResult.scanVersion, scanResult.geoAlgoVersion);
    console.log('Trace ID:', geo?.debug?.traceId);
    console.log('Debug Path:', geo?.debug?.path);
    console.log('Scores:', { meo: meoScore, seo: seoScore, geo: geo?.score, overall: overallScore });
    console.log('GEO (canonical):', {
      algoVersion: geo?.algoVersion,
      status: geo?.status,
      score: geo?.score,
      category: geo?.category,
      explainReady: !!geo?.explain,
      explainJobId: geo?.explainJobId
    });
    if (import.meta.env.DEV && geo && !geo.explainJobId && geo.status !== 'error') {
      console.warn('[Scanner] Backend did not return explainJobId – polling will show "jobId: none". Check backend logs and category resolution.');
    }
    console.log('MEO Data:', {
      debugStamp: meoData?.debugStamp,
      runId: meoData?.runId,
      scoringVersion: meoData?.scoringVersion,
      wasCapped: meoData?.scoringBreakdown?.wasCapped
    });
    const leadForwardStatus = scanResult?.leadForwardStatus ?? scanResult?.meta?.leadForwardStatus;
    console.log('Scan Status:', scanResult.meta?.scanStatus);
    console.log('Processing Time:', scanResult.meta?.processingTimeMs, 'ms');
    console.log('📋 Lead Forward Status:', leadForwardStatus ?? '(not in response – check backend is from apps/.../mgo-scanner-backend on port 3002)');
    console.log('Full Scan Payload:', scanResult);
    console.log('═══════════════════════════════════════════════════════');
    
    // Calculate percentile
    const percentileData = geo?.score === null || geo?.score === undefined ? { percentile: null, text: '—' } : calculatePercentile(meoScore, geo.score);

    // Build optimization bar data
    const optimizationBar = {
      meo: meoScore,
      seo: seoScore,
      geo: geo?.score,
      final: overallScore
    };

    // Debug: store response keys for GEO_JOBID_MISSING diagnosis (DEV)
    const scanResponseKeys = scanResult ? Object.keys(scanResult) : [];
    const geoResponseKeys = scanResult?.geo ? Object.keys(scanResult.geo) : null;
    const rawResult = {
      success: true,
      leadForwardStatus,
      result: {
        _debugScanResponseKeys: scanResponseKeys,
        leadForwardStatus,
        _debugGeoResponseKeys: geoResponseKeys,
        place: {
          ...placeDetails,
          formattedAddress: placeDetails.formatted_address,
          name: placeDetails.name,
          address: placeDetails.formatted_address,
          rating: placeDetails.rating || 0,
          reviewCount: placeDetails.user_ratings_total || 0,
          websiteUri: placeDetails.website || 'Not available',
          internationalPhoneNumber: placeDetails.international_phone_number || placeDetails.formatted_phone_number || 'Not available',
          types: placeDetails.types || []
        },
        scores: {
          meo: Math.round(meoScore),
          seo: seoScore !== null ? Math.round(seoScore) : null,
          geo: geo?.score === null || geo?.score === undefined ? null : Math.round(geo.score),
          overall: overallScore,
          final: overallScore
        },
        meoBackendData: meoData, // Include full MEO backend response
        geo, // ✅ single canonical GEO object
        percentile: percentileData.percentile,
        percentileText: percentileData.text,
        optimizationBar: {
          meo: meoScore,
          seo: seoScore,
          geo: geo?.score,
          final: overallScore
        }
      }
    };

    // Apply normalizeGeo adapter to ensure canonical shape
    return normalizeGeo(rawResult);
  } catch (error) {
    console.error('[Scanner] Backend API call failed, falling back to local calculation:', error);
    
    // Fallback to local calculation if backend fails
    const meoScore = calculateMEOScore(placeDetails);
    const hasWebsite = !!(placeDetails.website || placeDetails.websiteUri);
    const hasDescription = !!(placeDetails.editorial_summary?.overview || placeDetails.editorialSummary?.text);
    const hasHours = !!(placeDetails.opening_hours);
    const hasPhone = !!(placeDetails.formatted_phone_number || placeDetails.international_phone_number);
    let fallbackSeo = 35;
    if (hasWebsite) fallbackSeo += 25;
    if (hasDescription) fallbackSeo += 15;
    if (hasHours) fallbackSeo += 8;
    if (hasPhone) fallbackSeo += 7;
    fallbackSeo = Math.min(100, Math.round(fallbackSeo));
    const fallbackOverall = Math.round((meoScore + fallbackSeo) / 2);

    return {
      success: true,
      result: {
        place: {
          ...placeDetails,
          formattedAddress: placeDetails.formatted_address,
          name: placeDetails.name,
          address: placeDetails.formatted_address,
          rating: placeDetails.rating || 0,
          reviewCount: placeDetails.user_ratings_total || 0,
          websiteUri: placeDetails.website || 'Not available',
          internationalPhoneNumber: placeDetails.international_phone_number || placeDetails.formatted_phone_number || 'Not available',
          types: placeDetails.types || []
        },
        scores: {
          meo: Math.round(meoScore),
          seo: fallbackSeo,
          geo: null, // ✅ NO DEFAULT - GEO unavailable in fallback
          overall: fallbackOverall,
          final: fallbackOverall
        },
        geo: {
          status: 'error',
          score: null,
          percentile: null,
          confidence: 'low',
          category: null,
          categoryDebug: {},
          explain: null,
          explainStatus: 'error',
          explainJobId: null,
          algoVersion: 'fallback',
          generatedAt: new Date().toISOString(),
          error: 'Backend API unavailable'
        },
        percentile: null,
        percentileText: '—',
        optimizationBar: {
          meo: meoScore,
          seo: fallbackSeo,
          geo: null,
          final: fallbackOverall
        },
        warning: 'Backend API unavailable - GEO scoring disabled'
      }
    };
  }
}

// Normalize GEO object to canonical shape (removes old field references)
// If geo is missing entirely (backend response incomplete), inject minimal geo so UI doesn't break
function normalizeGeo(scanResult) {
  if (!scanResult?.geo) {
    if (import.meta.env.DEV) {
      console.warn('[Scanner] Backend response missing geo object — backend response incomplete. Check API_BASE_URL and proxy.');
    }
    return {
      ...scanResult,
      geo: {
        status: 'error',
        score: null,
        percentile: null,
        confidence: 'low',
        category: null,
        explainStatus: 'error',
        explain: null,
        explainJobId: null,
        retryable: true,
        error: { code: 'GEO_MISSING', message: 'Backend response incomplete — geo object missing' }
      }
    };
  }

  const geo = scanResult.geo;

  // Remove any old field references and ensure canonical shape
  const canonicalGeo = {
    status: geo.status,
    score: geo.score,
    percentile: geo.percentile,
    confidence: geo.confidence,
    category: geo.category,
    explainStatus: geo.explainStatus,
    explain: geo.explain,
    categoryDebug: geo.categoryDebug,
    explainJobId: geo.explainJobId ?? null,
    retryable: geo.retryable ?? false,
    traceId: geo.debug?.traceId || geo.traceId,
    algoVersion: geo.algoVersion
  };

  return {
    ...scanResult,
    geo: canonicalGeo
  };
}

/**
 * Get nearby competitors from Google Places API - Phase A
 * Returns REAL competitors with verifiable placeIds
 * 
 * @param {string} placeId - Target business placeId
 * @param {number} radius - Search radius in meters (default 5000)
 * @param {number} limit - Max competitors to return (default 10)
 * @param {string} category - Business category for filtering (optional, e.g. 'coffee_shop')
 * @returns {Promise<{success: boolean, competitors: Array, target: Object}>}
 */
export const getNearbyCompetitors = async ({ placeId, radius = 5000, limit = 10, category = null }) => {
  if (!placeId) {
    return { success: false, error: 'placeId is required', competitors: [] };
  }

  try {
    let url = `${API_BASE_URL}/api/geo/competitors/nearby?placeId=${encodeURIComponent(placeId)}&radius=${radius}&limit=${limit}`;
    
    // Add category filter if provided
    if (category) {
      url += `&category=${encodeURIComponent(category)}`;
    }
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('[Nearby Competitors] API error:', errorData);
      return { 
        success: false, 
        error: errorData.message || `HTTP ${response.status}`,
        competitors: [] 
      };
    }

    const data = await response.json();
    return data;

  } catch (error) {
    console.error('[Nearby Competitors] Fetch error:', error);
    return { 
      success: false, 
      error: error.message || 'Failed to fetch competitors',
      competitors: [] 
    };
  }
};

// Mock functions for compatibility (return empty/success responses)
export const runDeterministicScan = async () => ({ success: true, data: {} });
export const directoryFixAgent = async () => ({ success: true, data: {} });
export const runFullAudit = async () => ({ success: true, data: {} });
export const runDirectorySyncScan = async () => ({ success: true, data: {} });
export const geoVisibilityHeatmap = async () => ({ success: true, data: {} });
export const competitorWatchdog = async () => ({ success: true, data: {} });
export const reviewSentimentEngine = async () => ({ success: true, data: {} });
export const createCheckoutSession = async () => ({ success: true, url: '' });
export const createPortalSession = async () => ({ success: true, url: '' });
export const stripeWebhook = async () => ({ success: true });
export const sendScanResults = async () => ({ success: true });
export const scanCounter = async () => ({ success: true, count: 0 });
export const advancedScan = async () => ({ success: true, data: {} });
export const trackScan = async () => ({ success: true });
export const betaRemaining = async () => ({ success: true, remaining: 0 });
export const betaJoin = async () => ({ success: true });
export const verifyPlacesApi = verifyPlacesApiFunc;
export const autocomplete = async (params) => await getPlacesAutocomplete(params);
export const waitlistExtractor = async (formData) => {
  // Mock implementation - in production, this would parse the file
  // For now, return success
  return { status: 'ok', success: true, data: [] };
};
export const runOnlineScan = async () => ({ success: true, data: {} });

// Fix invalid export name
export const placesScan = async (params) => {
  return await scanner(params);
};
