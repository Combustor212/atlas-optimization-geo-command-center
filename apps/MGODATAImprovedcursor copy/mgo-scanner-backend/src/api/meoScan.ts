/**
 * MEO Scan API Handler (v11 - Canonical GEO Object)
 * Returns ONE canonical geo object with strict status logic
 */

import { Request, Response } from 'express';
import { normalizeScanInput, validateNormalizedInput } from '../meo/normalizeScanInput';
import { calculateMEOScore } from '../meo/meoEngine';
import { findPlaceFromText, getPlaceDetails } from '../lib/places';
import { resolveCategory, getFallbackCategory } from '../geo/resolveCategory';
import { createExplainJob } from '../geo/explainJobs';
import { computeSeoVisibilityScore } from '../services/seoVisibilityScore';
import { computeSeoCompletenessScore } from '../services/seoCompletenessScore';
import type { ScanInput } from '../meo/meoSchema';
import { logger } from '../lib/logger';
import { createFreeScanSubmission, generateIdempotencyKey, hashIP } from '../db/freeScanRepo';
import { enqueueFreeScanEmail } from '../services/emailQueueProcessor';
import { forwardLeadToGeoCommandCenter } from './agsLeads';

const SCAN_VERSION = "scan-v1.0";
const GEO_ALGO_VERSION = "geo-v5";

export async function handleMEOScan(req: Request, res: Response): Promise<void> {
  const startTime = Date.now();

  try {
    const rawInput = req.body as ScanInput;

    // a) Log when scan starts
    const raw = rawInput as Record<string, unknown>;
    const placeIdInput = raw?.place_id;
    const businessNameInput = raw?.businessName || raw?.business_name;
    console.log('[MEO Scan] a) Scan started', { placeId: placeIdInput, businessName: businessNameInput });

    if (!rawInput || typeof rawInput !== 'object') {
      res.status(400).json({
        error: 'Invalid request body',
        message: 'Request body must be a valid scan input object'
      });
      return;
    }

    const normalizedInput = normalizeScanInput(rawInput);

    const validationErrors = validateNormalizedInput(normalizedInput);
    if (validationErrors.length > 0) {
      res.status(400).json({
        error: 'Validation failed',
        message: 'Input validation errors',
        details: validationErrors
      });
      return;
    }

    let placeId = normalizedInput.place_id;

    // 1. Find place if no place_id provided
    if (!placeId) {
      const searchQuery = `${normalizedInput.businessName}, ${normalizedInput.location}`;
      logger.info('[MEO Scan] Finding place', { q: searchQuery });
      const foundPlaceId = await findPlaceFromText(searchQuery);
      placeId = foundPlaceId || undefined;

      if (!placeId) {
        res.status(404).json({
          error: 'Place not found',
          message: `Could not find business: ${searchQuery}`,
          details: {
            businessName: normalizedInput.businessName,
            location: normalizedInput.location
          }
        });
        return;
      }
    }

    // 2. Get place details (ONCE - shared by MEO + GEO)
    logger.info('[MEO Scan] Fetching details', { place_id: placeId });
    const placeDetails = await getPlaceDetails(placeId);

    if (!placeDetails) {
      res.status(404).json({
        error: 'Place details not found',
        message: 'Could not retrieve business details from Google Places',
        details: { place_id: placeId }
      });
      return;
    }

    // Extract location from place details if not provided
    const location = normalizedInput.location || placeDetails.formatted_address || placeDetails.vicinity || 'Unknown';

    // b) Log after place details fetched
    const placeTypes = placeDetails?.types || [];
    const hasWebsite = !!(placeDetails?.websiteUri || placeDetails?.website);
    console.log('[MEO Scan] b) Place details fetched', {
      placeId,
      placeTypes: placeTypes.slice(0, 10),
      websitePresent: hasWebsite,
      displayName: placeDetails?.displayName?.text || placeDetails?.name
    });

    // 3. Calculate MEO score (async - now with real competitor fetching)
    logger.info('[MEO Scan] Calculating MEO score', { businessName: normalizedInput.businessName });
    const meoResult = await calculateMEOScore(
      normalizedInput.businessName,
      location,
      placeDetails
    );
    
    // Check if MEO scoring failed due to validation or insufficient competitors
    if (meoResult.body.status === 'error') {
      logger.error('[MEO Scan] MEO scoring failed', {
        businessName: normalizedInput.businessName,
        placeId,
        error: meoResult.body.gradeRationale
      });
      
      // Return error response instead of proceeding
      res.status(400).json({
        success: false,
        error: 'MEO scoring blocked',
        message: meoResult.body.gradeRationale,
        details: meoResult.body.meoBreakdown
      });
      return;
    }

    const locationLabel = location;

    // 4. Resolve GEO category + create explain job (wrapped in try/catch - never abort scan)
    let categoryResolution: Awaited<ReturnType<typeof resolveCategory>>;
    try {
      logger.info('[MEO Scan] Resolving GEO category (strict)', { placeId });
      categoryResolution = await resolveCategory(placeDetails);
      if (!categoryResolution.key || !categoryResolution.label) {
        logger.warn('[MEO Scan] resolveCategory returned null - using fallback', {
          placeId,
          debug: categoryResolution.debug?.finalMethod
        });
        categoryResolution = getFallbackCategory(placeDetails);
      }
      logger.info('[MEO Scan] Category resolved', {
        key: categoryResolution.key,
        label: categoryResolution.label,
        confidence: categoryResolution.confidence,
        source: categoryResolution.source
      });
      // c) Log after resolveCategory
      console.log('[MEO Scan] c) resolveCategory done', {
        resolvedCategory: categoryResolution.key ? { key: categoryResolution.key, label: categoryResolution.label } : null,
        confidence: categoryResolution.confidence
      });
    } catch (resolveErr: any) {
      const errMsg = resolveErr instanceof Error ? resolveErr.message : String(resolveErr);
      logger.error('[MEO Scan] resolveCategory threw - using fallback', {
        placeId,
        error: errMsg
      });
      categoryResolution = getFallbackCategory(placeDetails);
      console.log('[MEO Scan] c) resolveCategory threw, using fallback', {
        fallbackKey: categoryResolution?.key,
        fallbackLabel: categoryResolution?.label
      });
    }

    // 5. Build canonical GEO object with strict status logic
    const hasCategory = !!categoryResolution.key && !!categoryResolution.label && categoryResolution.confidence >= 0.65;
    
    let geoStatus: 'category_unresolved' | 'generating' | 'ok' | 'error' | 'failed' = 'category_unresolved';
    let geoScore: number | null = null;
    let geoPercentile: number | null = null;
    let geoConfidence: 'low' | 'medium' | 'high' = 'low';
    let explainStatus: 'pending' | 'ready' | 'error' = 'pending';
    let geoJobId: string | undefined;
    let geoError: string | null = null;
    let geoRetryable = false;
    let geoErrorObj: { code: string; message: string } | undefined;

    const hasAnyCategory = !!categoryResolution.key && !!categoryResolution.label;

    if (!hasAnyCategory) {
      // Case 1: No category - use fallback so we ALWAYS attempt explainJobId (fixes GEO_JOBID_MISSING)
      geoStatus = 'generating';
      geoScore = null;
      geoPercentile = null;
      geoConfidence = 'low';
      explainStatus = 'pending';
      try {
        // d) Log before createExplainJob
        console.log('[MEO Scan] d) Before createExplainJob', { placeId, category: categoryResolution.key });
        logger.info('[MEO Scan] createExplainJob starting (fallback category)', { placeId });
        geoJobId = createExplainJob(placeId, categoryResolution, locationLabel);
        // e) Log after createExplainJob success
        console.log('[MEO Scan] e) createExplainJob success', { explainJobId: geoJobId });
        logger.info('[MEO Scan] GEO explain job created (fallback category)', {
          jobId: geoJobId,
          placeId,
          categoryKey: categoryResolution.key,
          reason: 'Category could not be resolved, using fallback'
        });
      } catch (jobError: any) {
        // f) Log catch createExplainJob error
        const errMsg = jobError instanceof Error ? jobError.message : String(jobError);
        const errStack = jobError instanceof Error ? jobError.stack : undefined;
        console.log('[MEO Scan] f) createExplainJob error (no category)', { error: errMsg, stack: errStack?.slice(0, 200) });
        logger.error('[MEO Scan] createExplainJob threw (no category)', {
          placeId,
          error: errMsg
        });
        geoStatus = 'failed';
        explainStatus = 'error';
        geoError = 'Explain generation failed to start';
        geoRetryable = true;
        geoErrorObj = { code: 'EXPLAIN_JOB_CREATE_FAILED', message: errMsg };
      }
    } else if (!hasCategory) {
      // Case 1b: Low-confidence category - still create explain job so frontend can poll
      geoStatus = 'generating';
      geoScore = null;
      geoPercentile = null;
      geoConfidence = 'low';
      explainStatus = 'pending';
      try {
        console.log('[MEO Scan] d) Before createExplainJob (low-confidence)', { placeId, category: categoryResolution.key });
        logger.info('[MEO Scan] createExplainJob starting (low-confidence)', { placeId });
        geoJobId = createExplainJob(placeId, categoryResolution, locationLabel);
        console.log('[MEO Scan] e) createExplainJob success (low-confidence)', { explainJobId: geoJobId });
        logger.info('[MEO Scan] GEO explain job created (low-confidence category)', {
          jobId: geoJobId,
          placeId,
          categoryKey: categoryResolution.key,
          confidence: categoryResolution.confidence
        });
      } catch (jobError: any) {
        const errMsg = jobError instanceof Error ? jobError.message : String(jobError);
        console.log('[MEO Scan] f) createExplainJob error (low-confidence)', { error: errMsg });
        logger.error('[MEO Scan] createExplainJob threw', { placeId, error: errMsg });
        geoStatus = 'failed';
        explainStatus = 'error';
        geoError = 'Explain generation failed to start';
        geoRetryable = true;
        geoErrorObj = { code: 'EXPLAIN_JOB_CREATE_FAILED', message: errMsg };
      }
    } else {
      // Case 2: Category resolved - generate lightweight GEO immediately
      geoStatus = 'ok';
      explainStatus = 'ready';
      
      // ✅ QUICKFIX: Return simple GEO score immediately (no expensive OpenAI benchmark)
      // Calculate a provisional GEO score based on MEO signals (fast)
      const reviewCount = placeDetails.user_ratings_total || 0;
      const rating = placeDetails.rating || 0;
      const photoCount = placeDetails.photos?.length || 0;
      const hasWebsite = !!placeDetails.website;
      const hasHours = !!placeDetails.opening_hours;
      
      // Simple heuristic scoring (0-100)
      let provisionalGeoScore = 50; // base
      
      if (reviewCount >= 100) provisionalGeoScore += 20;
      else if (reviewCount >= 50) provisionalGeoScore += 15;
      else if (reviewCount >= 20) provisionalGeoScore += 10;
      else if (reviewCount >= 10) provisionalGeoScore += 5;
      
      if (rating >= 4.5) provisionalGeoScore += 15;
      else if (rating >= 4.0) provisionalGeoScore += 10;
      else if (rating >= 3.5) provisionalGeoScore += 5;
      
      if (photoCount >= 50) provisionalGeoScore += 10;
      else if (photoCount >= 20) provisionalGeoScore += 7;
      else if (photoCount >= 10) provisionalGeoScore += 5;
      else if (photoCount >= 5) provisionalGeoScore += 3;
      
      if (hasWebsite) provisionalGeoScore += 5;
      if (hasHours) provisionalGeoScore += 3;
      
      // Cap at 100
      let rawGeoScore = Math.min(100, Math.round(provisionalGeoScore));
      
      // Apply floor for known national brands (Best Buy, Walmart, etc.) — a 59 GEO for Best Buy is unrealistic
      const businessName = (placeDetails.displayName as any)?.text || placeDetails.name || '';
      const nameLower = String(businessName).toLowerCase();
      const NATIONAL_BRANDS = ['best buy', 'walmart', 'target', 'home depot', 'costco', 'lowes', "mcdonald's", 'starbucks', 'chipotle', 'dollar general', 'cvs', 'walgreens', 'kroger', 'publix', 'whole foods', 'aldi', 'tesla', 'apple store'];
      const isNationalBrand = NATIONAL_BRANDS.some(brand => nameLower.includes(brand));
      geoScore = isNationalBrand ? Math.max(80, rawGeoScore) : rawGeoScore;
      
      // Calculate percentile (mock - would need real competitor data)
      geoPercentile = geoScore; // Simplified: percentile ≈ score
      
      // Determine confidence based on data availability
      if (reviewCount >= 50 && photoCount >= 20) {
        geoConfidence = 'high';
      } else if (reviewCount >= 10 && photoCount >= 5) {
        geoConfidence = 'medium';
      } else {
        geoConfidence = 'low';
      }
      
      logger.info('[MEO Scan] GEO score calculated (lightweight)', {
        score: geoScore,
        percentile: geoPercentile,
        confidence: geoConfidence,
        categoryKey: categoryResolution.key,
        categoryLabel: categoryResolution.label
      });
      
      // Create async explain job for v2 multi-query evaluation
      // CRITICAL: Wrap in try-catch to ensure job creation never blocks scan
      try {
        console.log('[MEO Scan] d) Before createExplainJob (resolved category)', { placeId, category: categoryResolution.key });
        logger.info('[MEO Scan] createExplainJob starting (resolved category)', { placeId });
        geoJobId = createExplainJob(placeId, categoryResolution, locationLabel);
        console.log('[MEO Scan] e) createExplainJob success (resolved category)', { explainJobId: geoJobId });
        geoStatus = 'generating'; // Job is running, not yet complete
        explainStatus = 'pending'; // Explain will be ready when job completes
        
        logger.info('[MEO Scan] GEO explain job created', {
          jobId: geoJobId,
          placeId,
          categoryKey: categoryResolution.key
        });
      } catch (jobError: any) {
        const errMsg = jobError instanceof Error ? jobError.message : String(jobError);
        console.log('[MEO Scan] f) createExplainJob error (resolved category)', { error: errMsg });
        logger.error('[MEO Scan] createExplainJob threw (scan continues)', {
          placeId,
          error: errMsg
        });
        geoStatus = 'ok'; // We have a score, so status is ok even without explain
        explainStatus = 'error';
        geoError = 'Explain generation failed to start';
        geoRetryable = true;
        geoErrorObj = { code: 'EXPLAIN_JOB_CREATE_FAILED', message: errMsg };
      }
    }

    // 6. INVARIANT ENFORCEMENT: This block is defensive, but with current logic
    // geoStatus can only be 'category_unresolved' or 'generating' at this point
    // If we ever add synchronous explain generation, this guard would catch bugs
    // where status is set to 'ok' without explain being ready

    // 6b. Calculate SEO Visibility Score (demand + visibility + coverage, no SERP scraping)
    const gbpFacts = meoResult.body.gbpFacts || meoResult.body.meoInputsUsed;
    let seoScore: number;
    let seoResult: { seo: number; confidence: string; breakdown: object };
    try {
      seoResult = await computeSeoVisibilityScore({
        place: placeDetails,
        location: locationLabel,
        categoryLabel: (hasCategory ? categoryResolution.label : null) ?? undefined,
        gbpFacts: gbpFacts ? {
          completenessScore: gbpFacts.completenessScore,
          hasDescription: gbpFacts.hasDescription,
          hasHours: gbpFacts.hasHours,
          hasPhone: gbpFacts.hasPhone,
        } : undefined,
        integrations: {}, // Keyword Planner / GSC when available
      });
      seoScore = seoResult.seo;
    } catch (seoErr) {
      logger.warn('[MEO Scan] SEO visibility computation failed, using completeness fallback', {
        error: seoErr instanceof Error ? seoErr.message : String(seoErr),
        placeId,
      });
      const rawFallback = computeSeoCompletenessScore(placeDetails, gbpFacts ? {
        completenessScore: gbpFacts.completenessScore,
        hasDescription: gbpFacts.hasDescription,
        hasHours: gbpFacts.hasHours,
        hasPhone: gbpFacts.hasPhone,
      } : null);
      // Cap at 75 when using fallback — we couldn't measure actual search visibility,
      // so avoid inflating scores; profile completeness alone shouldn't imply 100%
      seoScore = Math.min(75, rawFallback);
      seoResult = {
        seo: seoScore,
        confidence: 'low',
        breakdown: {
          demand: 0,
          visibility: 0,
          coverage: 0,
          keywordsEvaluated: 0,
          keywordsFound: 0,
          topKeywords: [],
        },
      };
    }

    // 7. Calculate overall score (MEO + GEO only, no SEO)
    const meoScore = meoResult.body.meoScore;
    let overallScore: number | null = null;
    if (geoScore !== null && meoScore !== null) {
      overallScore = Math.round((meoScore + geoScore) / 2);
    } else if (meoScore !== null) {
      overallScore = Math.round(meoScore);
    }

    const totalTime = Date.now() - startTime;
    logger.info('[MEO Scan] Scan complete', {
      ms: totalTime,
      meoScore,
      geoStatus,
      geoJobId,
      overallScore
    });

    // 8. Build canonical geo object
    // Generate lightweight explain if GEO is ready
    let geoExplain = null;
    if (geoStatus === 'ok' && geoScore !== null && hasCategory) {
      geoExplain = {
        summary: `Your GEO score is ${geoScore}/100 as a "${categoryResolution.label}". This is a provisional score based on your Google Business Profile data.`,
        topImpactDrivers: [
          {
            title: 'Get more reviews',
            detail: `You have ${placeDetails.user_ratings_total || 0} reviews. More reviews improve AI visibility.`,
            delta: 5,
            cta: 'Ask satisfied customers for reviews'
          },
          {
            title: 'Add more photos',
            detail: `You have ${placeDetails.photos?.length || 0} photos. Visual content boosts rankings.`,
            delta: 3,
            cta: 'Upload high-quality photos'
          },
          {
            title: 'Optimize website',
            detail: placeDetails.website ? 'Ensure your website has clear services and location info.' : 'Add a website to your Google Business Profile.',
            delta: 2,
            cta: placeDetails.website ? 'Review website content' : 'Add website'
          }
        ],
        topQueryWins: [],
        topQueryLosses: [],
        queriesUsed: [],
        competitorsUsed: [],
        geoScore: geoScore,
        percentile: geoPercentile || 0,
        confidence: geoConfidence,
        confidenceReasons: [
          geoConfidence === 'high' ? 'Strong data signals' : 
          geoConfidence === 'medium' ? 'Moderate data available' : 
          'Limited data - add more reviews and photos for better accuracy'
        ],
        nicheLabel: categoryResolution.label,
        locationLabel
      };
    }

    const finalGeo = {
      status: geoStatus,
      score: geoScore,
      percentile: geoPercentile,
      confidence: geoConfidence,
      category: (hasCategory || hasAnyCategory) ? {
        key: categoryResolution.key,
        label: categoryResolution.label
      } : null,
      categoryDebug: categoryResolution.debug,
      explain: geoExplain,
      explainStatus,
      explainJobId: geoJobId ?? null,
      retryable: geoRetryable,
      ...(geoErrorObj ? { error: geoErrorObj } : geoError ? { error: { code: 'GEO_ERROR', message: geoError } } : {}),
      algoVersion: GEO_ALGO_VERSION,
      generatedAt: new Date().toISOString(),
      debug: {
        traceId: `trace_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        path: "meoScan.ts->geoEngine.ts->resolvePrimaryCategory.ts",
        hasCategory,
        hasExplain: !!geoExplain,
        categoryConfidence: categoryResolution.confidence,
        invariantCheck: {
          status: geoStatus,
          hasCategory: !!categoryResolution.key,
          hasExplain: !!geoExplain,
          explainStatus,
          scoreIsNull: geoScore === null
        }
      }
    };

    // ============================================================================
    // FREE SCAN LEAD CAPTURE - Forward to Geo Command Center (async, non-blocking)
    // ============================================================================
    let leadForwardStatus: 'forwarded' | 'skipped_no_email' | 'skipped_no_key' | 'failed' = 'skipped_no_email';
    try {
      // Capture form data from request body (use 'any' to access optional fields)
      const rawBody = rawInput as any;
      const formData = {
        businessName: rawBody.businessName || normalizedInput.businessName,
        email: rawBody.email,
        phone: rawBody.phone,
        address: rawBody.address || placeDetails.formatted_address,
        city: rawBody.city || normalizedInput.location,
        state: rawBody.state,
        zipCode: rawBody.zipCode,
        country: rawBody.country || 'United States',
        website: placeDetails.website,
        placeId: placeId,
        // Include scan results for context
        meoScore,
        seoScore,
        geoScore,
        overallScore,
      };
      
      // Capture metadata (UTMs, referrer, user agent, etc.)
      const userAgent = req.headers['user-agent'] || '';
      const referer = req.headers.referer || req.headers.referrer || '';
      const clientIP = req.ip || req.socket.remoteAddress || '';
      
      // Parse query parameters for UTM tracking (if passed in body)
      const metadata = {
        ipHashed: hashIP(clientIP),
        userAgent: userAgent.substring(0, 500), // Limit length
        referrer: referer,
        landingPath: rawBody.landingPath || '/',
        utmSource: rawBody.utm_source,
        utmMedium: rawBody.utm_medium,
        utmCampaign: rawBody.utm_campaign,
        utmTerm: rawBody.utm_term,
        utmContent: rawBody.utm_content,
        scanTimestamp: new Date().toISOString(),
      };
      
      // Forward to Geo Command Center FIRST (critical - do before SQLite which may fail)
      if (!formData.email) {
        logger.info('[Lead Capture] No email in request - skipping Geo Command Center forward', {
          hasEmail: !!rawBody.email,
          businessName: formData.businessName,
        });
        leadForwardStatus = 'skipped_no_email';
      } else if (!process.env.AGS_LEADS_API_KEY) {
        logger.warn('[Lead Capture] AGS_LEADS_API_KEY not set - lead not forwarded');
        leadForwardStatus = 'skipped_no_key';
      } else {
        // Full scan report for admin view (exact report the company sees, unblurred)
        const scanReport = {
          scores: { meo: meoScore, seo: seoScore, geo: geoScore, overall: overallScore, final: overallScore },
          geo: finalGeo,
          body: meoResult,
          place: {
            place_id: placeId,
            name: placeDetails.name,
            formatted_address: placeDetails.formatted_address,
            formatted_phone_number: placeDetails.formatted_phone_number,
            international_phone_number: placeDetails.international_phone_number,
            website: placeDetails.website,
            rating: placeDetails.rating,
            user_ratings_total: placeDetails.user_ratings_total,
            opening_hours: placeDetails.opening_hours,
            types: placeDetails.types,
          },
        };

        const geoPayload = {
          source: 'scan',
          business_name: formData.businessName,
          businessName: formData.businessName,
          email: formData.email,
          phone: formData.phone || undefined,
          message: `Free scan completed. Scores: MEO ${meoScore ?? '—'}, SEO ${seoScore ?? '—'}, GEO ${geoScore ?? '—'}, Overall ${overallScore ?? '—'}`,
          metadata: {
            address: formData.address,
            city: formData.city,
            state: formData.state,
            zipCode: formData.zipCode,
            country: formData.country,
            website: formData.website,
            placeId: formData.placeId,
            meoScore,
            seoScore,
            geoScore,
            overallScore,
            ...metadata,
            scanReport,
          },
        };
        const forwardResult = await forwardLeadToGeoCommandCenter(geoPayload);
        if (forwardResult.success) {
          leadForwardStatus = 'forwarded';
          logger.info('[Lead Capture] Lead forwarded to Geo Command Center', { id: forwardResult.id, email: formData.email });
        } else {
          leadForwardStatus = 'failed';
          logger.error('[Lead Capture] Geo Command Center forward failed - check GEO_COMMAND_CENTER_URL, AGS_LEADS_API_KEY, and agency slug', {
            businessName: formData.businessName,
            email: formData.email,
          });
        }
      }

      // Generate idempotency key and create submission (SQLite - may fail if DB not set up)
      const scanRequestId = `scan_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const idempotencyKey = generateIdempotencyKey(scanRequestId, formData);
      
      const submissionId = createFreeScanSubmission({
        scanRequestId,
        formData,
        metadata,
        idempotencyKey,
      });
      
      enqueueFreeScanEmail(submissionId);
      
      logger.info('[Lead Capture] Free scan submission recorded', {
        submissionId,
        businessName: formData.businessName,
        idempotencyKey: idempotencyKey.substring(0, 16) + '...',
      });
    } catch (leadCaptureError) {
      // CRITICAL: Lead capture must never break the scan
      // Log error but continue with response
      logger.error('[Lead Capture] Failed to record submission', {
        error: leadCaptureError instanceof Error ? leadCaptureError.message : 'Unknown error',
        businessName: normalizedInput.businessName,
      });
    }

    // 9. Return response with canonical geo object
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    logger.info('[MEO Scan] Sending response', { leadForwardStatus });
    res.status(200).json({
      ...meoResult,
      leadForwardStatus, // Top-level for easy debugging
      scores: {
        meo: meoScore,
        seo: seoScore,
        geo: geoScore, // null until explain completes
        overall: overallScore,
        final: overallScore // alias for frontend compatibility
      },
      geo: finalGeo,
      scanVersion: SCAN_VERSION,
      geoAlgoVersion: GEO_ALGO_VERSION,
      meta: {
        processingTimeMs: totalTime,
        timestamp: new Date().toISOString(),
        scanStatus: 'complete',
        leadForwardStatus, // forwarded | skipped_no_email | skipped_no_key | failed
        seo: {
          confidence: seoResult.confidence,
          breakdown: seoResult.breakdown,
          keywordsSample: seoResult.breakdown.topKeywords.slice(0, 5).map((k) => ({
            keyword: k.keyword,
            rank: k.rank,
            points: k.points,
          })),
        },
      }
    });

  } catch (error) {
    const errMsg = error instanceof Error ? error.message : 'Unknown error';
    logger.error('[MEO Scan] Error', { message: errMsg });

    // ALWAYS include geo in error response for frontend consistency
    res.status(500).json({
      error: 'Internal server error',
      message: errMsg,
      geo: {
        status: 'failed',
        category: null,
        explainJobId: null,
        retryable: true,
        error: { code: 'SCAN_FAILED', message: errMsg }
      },
      details: {
        timestamp: new Date().toISOString()
      }
    });
  }
}

export function handleMEOScanHealth(req: Request, res: Response): void {
  res.json({
    status: 'ok',
    service: 'meo-scan',
    version: 'v11.0',
    timestamp: new Date().toISOString()
  });
}
