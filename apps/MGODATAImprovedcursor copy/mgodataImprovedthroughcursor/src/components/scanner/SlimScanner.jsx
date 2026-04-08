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
import { useGoogleMaps, useAutocompleteService } from '@/components/utils/useGoogleMaps';
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

function serializePlaceData(place) {
  if (!place) return null;
  try {
    const safe = {
      place_id: place.place_id, name: place.name, formatted_address: place.formatted_address,
      address_components: place.address_components, website: place.website,
      international_phone_number: place.international_phone_number,
      formatted_phone_number: place.formatted_phone_number,
      opening_hours: place.opening_hours, rating: place.rating,
      user_ratings_total: place.user_ratings_total, types: place.types,
      business_status: place.business_status,
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
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
  const [fallbackMode, setFallbackMode]   = useState(false);
  const [fallbackCity, setFallbackCity]   = useState('');
  const [isScanning, setIsScanning]       = useState(false);

  const businessInputRef = useRef(null);
  const dropdownRef      = useRef(null);

  const { isLoaded: mapsLoaded }                         = useGoogleMaps();
  const { getPredictions, isLoaded: autocompleteReady }  = useAutocompleteService();

  // ── Autocomplete ───────────────────────────────────────────────────────────
  const fetchSuggestions = useCallback(async (query) => {
    if (!query || query.length < 2 || !getPredictions) { setSuggestions([]); setShowDropdown(false); return; }
    setIsLoadingSuggestions(true);
    try {
      const preds = await getPredictions(query);
      setSuggestions(preds || []);
      setShowDropdown((preds?.length ?? 0) > 0);
    } catch { setSuggestions([]); setShowDropdown(false); }
    finally { setIsLoadingSuggestions(false); }
  }, [getPredictions]);

  const fillFromPlace = useCallback((place) => {
    const components = place?.address_components || [];
    const getComp = (type, short = false) => {
      const c = components.find(x => x.types?.includes(type));
      return c ? (short ? c.short_name : c.long_name) : '';
    };
    const street    = [getComp('street_number'), getComp('route')].filter(Boolean).join(' ').trim();
    const cityVal   = getComp('locality');
    const state     = getComp('administrative_area_level_1', true);
    const countryVal= getComp('country');
    const zip       = getComp('postal_code');
    if (street)    setStreetAddress(street);
    if (cityVal)   setCity(state ? `${cityVal}, ${state}` : cityVal);
    if (countryVal) {
      const match = COUNTRIES.find(c => c.toLowerCase() === countryVal.toLowerCase() || countryVal.toLowerCase().includes(c.toLowerCase()));
      if (match) setCountry(match);
    }
    if (zip) setPostalCode(zip);
  }, []);

  const handleSelectPrediction = useCallback(async (pred) => {
    const pid         = pred.place_id;
    const displayName = pred.structured_formatting?.main_text ?? pred.description ?? '';
    if (!pid) return;
    setBusinessName(displayName);
    if (onBusinessNameChange) onBusinessNameChange(displayName);
    setPlaceId(pid);
    setShowDropdown(false);
    setSuggestions([]);
    const secondary = pred.structured_formatting?.secondary_text ?? '';
    if (secondary) {
      const parts = secondary.split(',').map(s => s.trim());
      if (parts[0]) setCity(parts[0]);
      const lastPart = parts[parts.length - 1];
      const match = COUNTRIES.find(c => c.toLowerCase() === lastPart?.toLowerCase() || lastPart?.toLowerCase().includes(c.toLowerCase()));
      if (match) setCountry(match);
    }
    if (window.google?.maps?.places?.PlacesService) {
      const mapDiv = document.createElement('div');
      const svc = new window.google.maps.places.PlacesService(new window.google.maps.Map(mapDiv));
      svc.getDetails(
        { placeId: pid, fields: ['place_id','name','formatted_address','address_components','website','international_phone_number','formatted_phone_number','opening_hours','rating','user_ratings_total','types','business_status','photos'] },
        (result, status) => {
          if (status === window.google.maps.places.PlacesServiceStatus.OK && result) {
            setPlaceData(result);
            if (result.address_components?.length) fillFromPlace(result);
          } else {
            setPlaceData({ place_id: pid, name: displayName });
          }
        }
      );
    } else {
      setPlaceData({ place_id: pid, name: displayName });
    }
  }, [fillFromPlace, onBusinessNameChange]);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target) && businessInputRef.current && !businessInputRef.current.contains(e.target))
        setShowDropdown(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Debounced fetch
  useEffect(() => {
    if (!autocompleteReady || !businessName || placeId) {
      if (!businessName || placeId) { setSuggestions([]); setShowDropdown(false); }
      return;
    }
    const t = setTimeout(() => fetchSuggestions(businessName), 300);
    return () => clearTimeout(t);
  }, [businessName, placeId, autocompleteReady, fetchSuggestions]);

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
    if (!isEmailValid)            { toast.error('Please enter a valid email'); return; }
    if (!businessName?.trim())    { toast.error('Please enter a business name'); return; }
    if (fallbackMode && !fallbackCity) { toast.error('Please enter your city'); return; }
    if (!fallbackMode && !placeId)    { toast.error('Please select your business from the dropdown'); return; }

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
      photoCount:    (placeData?.photos || []).length || undefined,
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
              <div className="relative">
                <input
                  ref={businessInputRef}
                  type="text"
                  value={businessName}
                  onChange={handleBusinessChange}
                  placeholder={autocompleteReady ? 'Start typing your business name' : 'Loading...'}
                  autoComplete="off"
                  required
                  disabled={!autocompleteReady}
                  style={{ fontSize: '16px' }}
                  className={cn(
                    'w-full h-14 px-4 pr-10 border-2 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-400 transition-all',
                    placeId ? 'border-green-500 bg-green-50/20' : 'border-slate-200 bg-white'
                  )}
                />
                {placeId && <Check className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-green-600 pointer-events-none" />}
                {isLoadingSuggestions && !placeId && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-blue-500 animate-spin pointer-events-none" />}

                {/* Dropdown */}
                {showDropdown && suggestions.length > 0 && (
                  <div className="absolute z-[10000] w-full mt-1 bg-white border-2 border-blue-200 rounded-xl shadow-2xl max-h-72 overflow-y-auto">
                    {suggestions.map((pred, idx) => (
                      <button
                        key={pred.place_id ?? idx}
                        type="button"
                        onMouseDown={(e) => { e.preventDefault(); handleSelectPrediction(pred); }}
                        onTouchEnd={(e)  => { e.preventDefault(); handleSelectPrediction(pred); }}
                        className="w-full px-4 py-3.5 text-left hover:bg-blue-50 active:bg-blue-100 border-b border-slate-100 last:border-b-0 first:rounded-t-xl last:rounded-b-xl min-h-[48px] flex flex-col justify-center"
                      >
                        <div className="font-semibold text-sm text-slate-900">
                          {pred.structured_formatting?.main_text ?? pred.description}
                        </div>
                        {pred.structured_formatting?.secondary_text && (
                          <div className="text-xs text-slate-500 mt-0.5 truncate">{pred.structured_formatting.secondary_text}</div>
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

              {/* Silent auto-fill hint */}
              {!placeId && !fallbackMode && (
                <p className="mt-1.5 text-xs text-slate-400">
                  Address, city, country auto-fill silently in background
                </p>
              )}
              {placeId && (
                <p className="mt-1.5 text-xs text-green-600 font-medium flex items-center gap-1">
                  <Check className="w-3 h-3" /> Location captured
                </p>
              )}
              {!placeId && !fallbackMode && businessName.length >= 2 && !showDropdown && !isLoadingSuggestions && (
                <p className="mt-1.5 text-xs text-slate-400 flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3 text-amber-400" /> Select from the dropdown above
                  <button type="button" onClick={() => setFallbackMode(true)} className="ml-1 text-blue-500 underline">or enter manually</button>
                </p>
              )}
            </div>

            {/* ── Fallback city (manual entry) ───────────────────────────── */}
            {fallbackMode && (
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Your City</label>
                <input
                  type="text"
                  value={fallbackCity}
                  onChange={(e) => setFallbackCity(e.target.value)}
                  placeholder="e.g., Miami, FL"
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
                {isEmailValid && <Check className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-green-600 pointer-events-none" />}
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
              <span className="text-xs text-slate-400 flex items-center gap-1"><Check className="w-3 h-3 text-slate-400" /> 30 seconds</span>
              <span className="text-xs text-slate-400 flex items-center gap-1"><Check className="w-3 h-3 text-slate-400" /> No credit card</span>
              <span className="text-xs text-slate-400 flex items-center gap-1"><Check className="w-3 h-3 text-slate-400" /> No pitch</span>
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
