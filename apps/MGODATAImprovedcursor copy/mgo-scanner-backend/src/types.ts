/**
 * TypeScript types for MGO Scanner Backend
 */

export interface ScanRequest {
  query?: string | null;
  placeId?: string | null;
  websiteOverride?: string | null;
}

export interface NAP {
  name: string;
  address: string;
  phone: string;
  website?: string;
}

export interface PlaceDetails {
  place_id: string;
  name: string;
  formatted_address: string;
  geometry?: {
    location: {
      lat: number;
      lng: number;
    };
  };
  formatted_phone_number?: string;
  international_phone_number?: string;
  website?: string;
  websiteUri?: string;
  rating?: number;
  user_ratings_total?: number;
  opening_hours?: {
    weekday_text?: string[];
  };
  business_status?: string;
  types?: string[];
  primaryType?: string; // New: primary type from Places API
  primaryTypeDisplayName?: { text?: string; languageCode?: string }; // New: display name
  displayName?: { text?: string; languageCode?: string }; // New: business display name
  photos?: Array<{ photo_reference: string; height?: number; width?: number }>;
  editorial_summary?: { overview?: string; language?: string };
  editorialSummary?: { text?: string; languageCode?: string };
  reviews?: Array<{
    author_name?: string;
    author_url?: string;
    profile_photo_url?: string;
    language?: string;
    rating?: number;
    relative_time_description?: string;
    text?: string;
    time?: number;
  }>;
  utc_offset_minutes?: number;
}

export interface MEOScoreBreakdown {
  profile_completeness: {
    phone: number;
    website: number;
    opening_hours: number;
    types: number;
    photos: number;
    total: number;
  };
  reputation: {
    rating_quality: number;
    rating_volume: number;
    total: number;
  };
  trust_eligibility: {
    business_status: number;
    address_geometry: number;
    total: number;
  };
}

export interface MEOScore {
  score: number;
  breakdown: MEOScoreBreakdown;
}

export interface GeoWebsiteAnalysis {
  found_nap: NAP | null;
  nap_match: {
    name: "match" | "partial" | "mismatch" | "missing";
    address: "match" | "partial" | "mismatch" | "missing";
    phone: "match" | "partial" | "mismatch" | "missing";
  };
  localbusiness_schema: {
    present: boolean;
    valid: boolean;
    has_nap: boolean;
    sameAsCount: number;
  };
  sameAs: string[];
  service_area_clarity: "clear" | "some" | "unclear" | "missing";
  what_where_clarity: "clear" | "some" | "unclear" | "missing";
  faq_signals: {
    present: boolean;
    evidence: string[];
  };
}

export interface DirectoryCitation {
  directory: string;
  best_listing_url: string | null;
  extracted_nap: NAP | null;
  match_quality: "match" | "partial" | "mismatch" | "missing";
}

export interface GeoScoreBreakdown {
  nap_consistency: {
    website_nap_match: number;
    directory_citations: number;
    total: number;
  };
  structured_data: {
    localbusiness_schema: number;
    sameAs: number;
    service_area_clarity: number;
    total: number;
  };
  content_clarity: {
    what_where_clarity: number;
    faq_signals: number;
    total: number;
  };
}

export interface GeoScore {
  score: number;
  breakdown: GeoScoreBreakdown;
}

export interface CombinedScore {
  score: number;
  formula: string;
}

export interface ScanResponse {
  place: NAP;
  scores: {
    meo: MEOScore;
    geo: GeoScore;
    combined: CombinedScore;
  };
  checks: {
    directories: DirectoryCitation[];
    website: GeoWebsiteAnalysis | null;
  };
  timing: {
    places_fetch_ms: number;
    website_fetch_ms: number;
    meo_calculation_ms: number;
    geo_calculation_ms: number;
    total_ms: number;
  };
}

export interface DirectoryTarget {
  name: string;
  matchStrategy: "siteSearch" | "queryUrl";
  searchUrlPattern: string;
  baseUrl: string;
}

export interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

