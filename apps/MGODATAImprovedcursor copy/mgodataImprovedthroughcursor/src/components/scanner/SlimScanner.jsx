/**
 * SlimScanner — 2-field scan form (Business Name + Email)
 * Smart Search handles address/city/country silently in the background.
 * Used on the Landing page and anywhere a clean, minimal scan form is needed.
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { cn } from '@/lib/utils';
import ScanLoadingOverlay from '@/components/ScanLoadingOverlay';
import { Check, Loader2, ArrowRight, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';

const SCAN_PENDING_KEY = 'scanPending';
const SAVED_EMAIL_KEY  = 'scan_saved_email';

const COUNTRIES = [
  "United States","Canada","United Kingdom","Australia","Germany","France",
  "Spain","Italy","Netherlands","Belgium","Switzerland","Austria",
  "Sweden","Norway","Denmark","Finland","Ireland","Portugal","Poland",
  "Japan","South Korea","Singapore","Hong Kong","Taiwan","China",
  "India","United Arab Emirates","Saudi Arabia","Israel","Turkey",
  "Brazil","Mexico","Argentina","Chile","Colombia",
  "South Africa","Nigeria","Kenya","Egypt",
  "New Zealand","Philippines","Thailand","Malaysia","Indonesia","Vietnam"
].sort();

function fireTTQ(event, params = {}) {
  try { if (window.ttq) window.ttq.track(event, params); } catch (_) {}
}

// Normalize lat/lng across every shape we've ever seen from autocomplete predictions,
// the legacy Places Details API, the new Places API v1, and our serverless proxy.
// MEO scoring requires geometry.location.{lat,lng}; missing it produces
// "MEO scoring blocked: Geometry location (latitude/longitude) is required".
function normalizePlaceGeometry(place) {
  if (!place) return { lat: undefined, lng: undefined };
  const loc = place.geometry?.location;
  const rawLat =
    place.latitude ??
    place.lat ??
    (loc ? (typeof loc.lat === 'function' ? loc.lat() : loc.lat) : undefined) ??
    place.location?.latitude;
  const rawLng =
    place.longitude ??
    place.lng ??
    (loc ? (typeof loc.lng === 'function' ? loc.lng() : loc.lng) : undefined) ??
    place.location?.longitude;
  const lat = typeof rawLat === 'number' ? rawLat : Number(rawLat);
  const lng = typeof rawLng === 'number' ? rawLng : Number(rawLng);
  return {
    lat: Number.isFinite(lat) ? lat : undefined,
    lng: Number.isFinite(lng) ? lng : undefined,
  };
}

function serializePlaceData(place) {
  if (!place) return null;
  try {
    const { lat, lng } = normalizePlaceGeometry(place);
    // Preserve the photos array so the scan backend can use it as a fallback
    // when its server-side Places Details call is blocked (e.g. by referrer
    // restrictions on the production GOOGLE_PLACES_API_KEY). Strip the heavy
    // html_attributions to keep payload size small; we only need photo_reference
    // + height/width for length/count purposes.
    const photosArray = Array.isArray(place.photos)
      ? place.photos.map((p) => ({
          photo_reference: p?.photo_reference,
          width: typeof p?.width === 'number' ? p.width : undefined,
          height: typeof p?.height === 'number' ? p.height : undefined,
        }))
      : undefined;
    const photoCountValue = Array.isArray(place.photos)
      ? place.photos.length
      : (typeof place.photoCount === 'number' ? place.photoCount : undefined);
    const safe = {
      place_id: place.place_id, name: place.name, formatted_address: place.formatted_address,
      address_components: place.address_components, website: place.website,
      international_phone_number: place.international_phone_number,
      formatted_phone_number: place.formatted_phone_number,
      opening_hours: place.opening_hours, rating: place.rating,
      user_ratings_total: place.user_ratings_total, types: place.types,
      business_status: place.business_status,
      geometry: (lat != null && lng != null) ? { location: { lat, lng } } : undefined,
      // Mirror lat/lng at the top level so any downstream consumer that reads
      // `latitude`/`longitude` instead of `geometry.location` still gets values.
      latitude: lat,
      longitude: lng,
      photos: photosArray,
      photoCount: photoCountValue,
    };
    return JSON.parse(JSON.stringify(safe));
  } catch { return { place_id: place.place_id, name: place.name, formatted_address: place.formatted_address }; }
}

export default function SlimScanner({ onBusinessNameChange } = {}) {
  const navigate = useNavigate();

  // ── State ──────────────────────────────────────────────────────────────────
  const [email, setEmail] = useState(() => {
    try { const s = localStorage.getItem(SAVED_EMAIL_KEY); return s?.trim() || ''; } catch { return ''; }
  });
  const [isEmailValid, setIsEmailValid] = useState(() => {
    try { const s = localStorage.getItem(SAVED_EMAIL_KEY); return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s?.trim() || ''); } catch { return false; }
  });
  const [businessName, setBusinessName]   = useState('');
  const [placeId, setPlaceId]             = useState('');
  const [placeData, setPlaceData]         = useState(null);
  const [streetAddress, setStreetAddress] = useState('');
  const [city, setCity]                   = useState('');
  const [country, setCountry]             = useState('');
  const [postalCode, setPostalCode]       = useState('');
  const [suggestions, setSuggestions]     = useState([]);
  const [showDropdown, setShowDropdown]   = useState(false);
  const [isSearching, setIsSearching]     = useState(false);
  const [searchError, setSearchError]     = useState('');
  const [fallbackMode, setFallbackMode]   = useState(false);
  const [fallbackCity, setFallbackCity]   = useState('');
  const [isScanning, setIsScanning]       = useState(false);

  const businessInputRef = useRef(null);
  const dropdownRef      = useRef(null);
  const requestIdRef     = useRef(0);

  const fillFromPlace = useCallback((place) => {
    const components = place?.address_components || [];
    const getComp = (type, short = false) => {
      const c = components.find(x => x.types?.includes(type));
      return c ? (short ? c.short_name : c.long_name) : '';
    };
    const street     = [getComp('street_number'), getComp('route')].filter(Boolean).join(' ').trim();
    const cityVal    = getComp('locality');
    const state      = getComp('administrative_area_level_1', true);
    const countryVal = getComp('country');
    const zip        = getComp('postal_code');
    if (street)    setStreetAddress(street);
    if (cityVal)   setCity(state ? `${cityVal}, ${state}` : cityVal);
    if (countryVal) {
      const match = COUNTRIES.find(c => c.toLowerCase() === countryVal.toLowerCase() || countryVal.toLowerCase().includes(c.toLowerCase()));
      if (match) setCountry(match);
    }
    if (zip) setPostalCode(zip);
  }, []);

  const handleSelectPrediction = useCallback(async (pred) => {
    const pid         = pred.placeId;
    const displayName = pred.name;
    if (!pid) return;

    setBusinessName(displayName);
    if (onBusinessNameChange) onBusinessNameChange(displayName);
    setPlaceId(pid);
    setShowDropdown(false);
    setSuggestions([]);
    setIsSearching(false);
    setSearchError('');

    // Populate city/country from the autocomplete address immediately
    if (pred.address) {
      const parts = pred.address.split(',').map(s => s.trim());
      if (parts[0]) setCity(parts[0]);
      const lastPart = parts[parts.length - 1];
      const match = COUNTRIES.find(c =>
        c.toLowerCase() === lastPart?.toLowerCase() ||
        lastPart?.toLowerCase().includes(c.toLowerCase())
      );
      if (match) setCountry(match);
    }

    // Fetch full place details from the server-side proxy. The proxy now requests
    // the `geometry` field, so detail.result.geometry.location.{lat,lng} is populated.
    // We also mirror lat/lng to the top level so consumers reading `latitude`/`longitude`
    // (or just `lat`/`lng`) still get values without changing the wire shape.
    try {
      const r = await fetch(`/api/places?action=details&place_id=${encodeURIComponent(pid)}`);
      if (r.ok) {
        const detail = await r.json();
        if (detail.status === 'OK' && detail.result) {
          const result = detail.result;
          const { lat, lng } = normalizePlaceGeometry(result);
          const photoCountValue = Array.isArray(result.photos) ? result.photos.length : 0;
          const enriched = {
            ...result,
            ...(lat != null && lng != null
              ? {
                  latitude: lat,
                  longitude: lng,
                  geometry: { ...(result.geometry || {}), location: { lat, lng } },
                }
              : {}),
            photoCount: photoCountValue,
          };
          setPlaceData(enriched);
          if (result.address_components?.length) fillFromPlace(result);
        } else {
          setPlaceData({ place_id: pid, name: displayName });
        }
      } else {
        setPlaceData({ place_id: pid, name: displayName });
      }
    } catch {
      setPlaceData({ place_id: pid, name: displayName });
    }
  }, [fillFromPlace, onBusinessNameChange]);

  // Close dropdown on outside click or Escape key
  useEffect(() => {
    const handleClick = (e) => {
      if (
        dropdownRef.current && !dropdownRef.current.contains(e.target) &&
        businessInputRef.current && !businessInputRef.current.contains(e.target)
      ) setShowDropdown(false);
    };
    const handleKey = (e) => {
      if (e.key === 'Escape') setShowDropdown(false);
    };
    document.addEventListener('mousedown', handleClick);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('keydown', handleKey);
    };
  }, []);

  // ── Autocomplete: debounced fetch with race-condition protection ──────────
  useEffect(() => {
    const query = businessName.trim();

    if (query.length < 2) {
      requestIdRef.current += 1; // invalidate any in-flight request
      setIsSearching(false);
      setSuggestions([]);
      setShowDropdown(false);
      setSearchError('');
      return;
    }

    const requestId = ++requestIdRef.current;
    setSearchError('');

    const timer = setTimeout(async () => {
      try {
        setIsSearching(true);

        const res = await fetch(
          `/api/places?action=autocomplete&input=${encodeURIComponent(query)}`
        );

        if (!res.ok) throw new Error(`Places request failed: ${res.status}`);

        const data = await res.json();

        if (requestId !== requestIdRef.current) return;

        const raw =
          data.suggestions ||
          data.predictions ||
          data.results ||
          data.businesses ||
          [];

        const normalized = raw
          .map((item) => ({
            name:
              item.name ||
              item.businessName ||
              item.structured_formatting?.main_text ||
              item.description ||
              '',
            address:
              item.address ||
              item.formatted_address ||
              item.structured_formatting?.secondary_text ||
              item.vicinity ||
              item.description ||
              '',
            placeId: item.placeId || item.place_id || item.id || '',
            raw: item,
          }))
          .filter((item) => item.name && item.placeId);

        setSuggestions(normalized);
        setShowDropdown(normalized.length > 0);
        setSearchError(normalized.length ? '' : 'No businesses found');
      } catch {
        if (requestId !== requestIdRef.current) return;
        setSuggestions([]);
        setShowDropdown(false);
        setSearchError('Could not load businesses. Try again.');
      } finally {
        if (requestId === requestIdRef.current) setIsSearching(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [businessName]);

  // ── Handlers ───────────────────────────────────────────────────────────────
  const handleBusinessChange = (e) => {
    const v = e.target.value;
    setBusinessName(v);
    if (onBusinessNameChange) onBusinessNameChange(v);
    if (placeId) { setPlaceId(''); setPlaceData(null); setStreetAddress(''); }
    if (fallbackMode) { setFallbackMode(false); setFallbackCity(''); }
  };

  const handleEmailChange = (e) => {
    setEmail(e.target.value);
    setIsEmailValid(/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e.target.value));
  };

  const isReady = !!businessName && isEmailValid && (fallbackMode ? !!fallbackCity : !!placeId);

  const handleScan = () => {
    if (!isEmailValid)                       { toast.error('Please enter a valid email'); return; }
    if (!businessName?.trim())               { toast.error('Please enter a business name'); return; }
    if (fallbackMode && !fallbackCity)       { toast.error('Please enter your city'); return; }
    if (!fallbackMode && !placeId)           { toast.error('Please select your business from the dropdown'); return; }

    fireTTQ('SubmitForm', { content_name: 'Free Visibility Scan', content_type: 'lead_form' });
    fireTTQ('Lead', { content_name: 'scan-landing' });

    setIsScanning(true);
    const effectiveCity = fallbackMode ? fallbackCity : city;
    const cityParts     = effectiveCity.split(',').map(s => s.trim());
    const scanPending   = {
      placeId:       placeId || undefined,
      placeData:     serializePlaceData(placeData),
      businessName,
      city:          cityParts[0] || 'Unknown',
      state:         cityParts[1] || cityParts[0] || 'Unknown',
      country:       country || undefined,
      email:         email?.trim() || undefined,
      phone:         placeData?.formatted_phone_number || placeData?.international_phone_number || undefined,
      postalCode:    postalCode || undefined,
      streetAddress: streetAddress || placeData?.formatted_address,
      photoCount:    Array.isArray(placeData?.photos)
                        ? placeData.photos.length
                        : (typeof placeData?.photoCount === 'number' ? placeData.photoCount : undefined),
    };
    sessionStorage.setItem(SCAN_PENDING_KEY, JSON.stringify(scanPending));
    try { if (email?.trim()) localStorage.setItem(SAVED_EMAIL_KEY, email.trim()); } catch (_) {}
    navigate(createPageUrl('ScanResults'), { replace: true });
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <>
      <ScanLoadingOverlay isVisible={isScanning} businessName={businessName} />

      <div className="w-full max-w-md mx-auto">
        <div className="bg-white rounded-2xl shadow-xl border border-slate-100 p-6">
          <form onSubmit={(e) => { e.preventDefault(); handleScan(); }} className="space-y-4">

            {/* ── Business Name ──────────────────────────────────────────── */}
            <div ref={dropdownRef} className="relative">
              <label className="block text-sm font-semibold text-slate-700 mb-1.5 flex items-center gap-2">
                Business Name *
                <span className="inline-flex items-center gap-1 bg-blue-100 text-blue-700 text-[10px] font-bold px-2 py-0.5 rounded-full tracking-wide">
                  Smart Search
                </span>
              </label>
              {/* Input wrapper: must stay `relative` so the spinner anchors to the
                  input row (not to the dropdown beneath it) and never floats. */}
              <div className="relative">
                <input
                  ref={businessInputRef}
                  type="text"
                  value={businessName}
                  onChange={handleBusinessChange}
                  placeholder="Business name, city/state, or street"
                  autoComplete="off"
                  required
                  disabled={isScanning}
                  style={{ fontSize: '16px' }}
                  className={cn(
                    'w-full h-14 px-4 pr-12 border-2 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-400 transition-all',
                    placeId ? 'border-green-500 bg-green-50/20' : 'border-slate-200 bg-white'
                  )}
                />
                {placeId && (
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none">
                    <Check className="w-5 h-5 text-green-600" />
                  </div>
                )}
                {isSearching && businessName.trim().length >= 2 && !placeId && !showDropdown && (
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none">
                    <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />
                  </div>
                )}

                {/* Dropdown */}
                {showDropdown && (
                  <div className="absolute z-[10000] w-full mt-1 bg-white border-2 border-blue-200 rounded-xl shadow-2xl max-h-72 overflow-y-auto">
                    {suggestions.map((pred, idx) => (
                      <button
                        key={pred.placeId ?? idx}
                        type="button"
                        onMouseDown={(e) => { e.preventDefault(); handleSelectPrediction(pred); }}
                        onTouchEnd={(e)  => { e.preventDefault(); handleSelectPrediction(pred); }}
                        className="w-full px-4 py-3.5 text-left hover:bg-blue-50 active:bg-blue-100 border-b border-slate-100 last:border-b-0 first:rounded-t-xl last:rounded-b-xl min-h-[48px] flex flex-col justify-center"
                      >
                        <div className="font-semibold text-sm text-slate-900">{pred.name}</div>
                        {pred.address && (
                          <div className="text-xs text-slate-500 mt-0.5 truncate">{pred.address}</div>
                        )}
                      </button>
                    ))}
                    <button
                      type="button"
                      onMouseDown={(e) => { e.preventDefault(); setShowDropdown(false); setFallbackMode(true); }}
                      onTouchEnd={(e)  => { e.preventDefault(); setShowDropdown(false); setFallbackMode(true); }}
                      className="w-full px-4 py-3 text-left text-xs text-slate-500 hover:bg-slate-50 last:rounded-b-xl min-h-[44px] flex items-center border-t border-slate-100"
                    >
                      Can't find your business? Enter manually →
                    </button>
                  </div>
                )}
              </div>

              {/* Hint text */}
              {!placeId && !fallbackMode && !searchError && (
                <p className="mt-1.5 text-xs text-slate-400">
                  Tip: add city, state, or street to narrow results.
                </p>
              )}
              {placeId && (
                <p className="mt-1.5 text-xs text-green-600 font-medium flex items-center gap-1">
                  <Check className="w-3 h-3" /> Location captured
                </p>
              )}
              {searchError && !isSearching && !placeId && !fallbackMode && (
                <p className="mt-1.5 text-xs text-slate-500 flex items-center gap-1">
                  {searchError !== 'No businesses found' && (
                    <AlertTriangle className="w-3 h-3 text-amber-400" />
                  )}
                  {searchError}
                  <button
                    type="button"
                    onClick={() => { setSearchError(''); setFallbackMode(true); }}
                    className="ml-1 text-blue-500 underline"
                  >
                    Enter manually →
                  </button>
                </p>
              )}
            </div>

            {/* ── City fallback (manual entry) ───────────────────────────── */}
            {fallbackMode && (
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Your City</label>
                <input
                  type="text"
                  value={fallbackCity}
                  onChange={(e) => setFallbackCity(e.target.value)}
                  placeholder="e.g., Miami, FL"
                  autoFocus
                  style={{ fontSize: '16px' }}
                  className="w-full h-14 px-4 border-2 border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-400 transition-all"
                />
              </div>
            )}

            {/* ── Email ──────────────────────────────────────────────────── */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Your Email</label>
              <div className="relative">
                <input
                  type="email"
                  value={email}
                  onChange={handleEmailChange}
                  placeholder="you@yourbusiness.com"
                  required
                  style={{ fontSize: '16px' }}
                  className={cn(
                    'w-full h-14 px-4 pr-10 border-2 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-400 transition-all',
                    isEmailValid ? 'border-green-500 bg-green-50/20' : 'border-slate-200 bg-white'
                  )}
                />
                {isEmailValid && (
                  <Check className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-green-600 pointer-events-none" />
                )}
              </div>
            </div>

            {/* ── Submit ─────────────────────────────────────────────────── */}
            <button
              type="submit"
              disabled={isScanning || !isReady}
              className={cn(
                'w-full h-14 rounded-xl font-bold text-base text-white flex items-center justify-center gap-2 transition-all mt-1',
                isReady && !isScanning
                  ? 'bg-slate-900 hover:bg-slate-800 shadow-lg hover:shadow-xl hover:-translate-y-0.5'
                  : 'bg-slate-300 cursor-not-allowed'
              )}
            >
              {isScanning
                ? <><Loader2 className="w-5 h-5 animate-spin" /> Scanning your business...</>
                : <>Run My Free Scan <ArrowRight className="w-5 h-5" /></>
              }
            </button>

            {/* ── Trust signals ──────────────────────────────────────────── */}
            <div className="flex items-center justify-center gap-4 pt-0.5">
              <span className="text-xs text-slate-400 flex items-center gap-1">
                <Check className="w-3 h-3 text-slate-400" /> 30 seconds
              </span>
              <span className="text-xs text-slate-400 flex items-center gap-1">
                <Check className="w-3 h-3 text-slate-400" /> No credit card
              </span>
              <span className="text-xs text-slate-400 flex items-center gap-1">
                <Check className="w-3 h-3 text-slate-400" /> No pitch
              </span>
            </div>

            {/* ── Bottom pill ────────────────────────────────────────────── */}
            <div className="flex justify-center pt-1">
              <span className="inline-flex items-center gap-1.5 bg-green-50 border border-green-200 text-green-700 text-xs font-semibold px-3 py-1 rounded-full">
                <Check className="w-3 h-3" />
                2 fields · Smart Search handles the rest
              </span>
            </div>

          </form>
        </div>
      </div>
    </>
  );
}
