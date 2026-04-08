/**
 * /scan-b — Version B (Challenger)
 * Single field first flow: Business Name only on Step 1.
 * After selecting from dropdown → Step 2 shows email field.
 * Reduces initial friction to ONE selection.
 * TikTok variant: 'scan-b'
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { cn } from '@/lib/utils';
import AGSLogo from '../components/AGSLogo';
import ScanLoadingOverlay from '../components/ScanLoadingOverlay';
import { useGoogleMaps, useAutocompleteService } from '@/components/utils/useGoogleMaps';
import { Check, Loader2, ArrowRight, AlertTriangle, ChevronLeft, Mail } from 'lucide-react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';

const SCAN_PENDING_KEY = 'scanPending';
const SAVED_EMAIL_KEY = 'scan_saved_email';

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

export default function ScanPageB() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1); // 1 = business name, 2 = email

  // Business Name state
  const [businessName, setBusinessName] = useState('');
  const [placeId, setPlaceId] = useState('');
  const [placeData, setPlaceData] = useState(null);
  const [streetAddress, setStreetAddress] = useState('');
  const [city, setCity] = useState('');
  const [country, setCountry] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
  const [fallbackMode, setFallbackMode] = useState(false);
  const [fallbackCity, setFallbackCity] = useState('');

  // Email state
  const [email, setEmail] = useState(() => {
    try { const s = localStorage.getItem(SAVED_EMAIL_KEY); return s?.trim() || ''; } catch { return ''; }
  });
  const [isEmailValid, setIsEmailValid] = useState(() => {
    try { const s = localStorage.getItem(SAVED_EMAIL_KEY); return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s?.trim() || ''); } catch { return false; }
  });
  const [isScanning, setIsScanning] = useState(false);

  const businessInputRef = useRef(null);
  const dropdownRef = useRef(null);
  const emailInputRef = useRef(null);

  const { isLoaded: mapsLoaded } = useGoogleMaps();
  const { getPredictions, isLoaded: autocompleteReady } = useAutocompleteService();

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
    const street = [getComp('street_number'), getComp('route')].filter(Boolean).join(' ').trim();
    const cityVal = getComp('locality');
    const state = getComp('administrative_area_level_1', true);
    const countryVal = getComp('country');
    const zip = getComp('postal_code');
    if (street) setStreetAddress(street);
    if (cityVal) setCity(state ? `${cityVal}, ${state}` : cityVal);
    if (countryVal) {
      const match = COUNTRIES.find(c => c.toLowerCase() === countryVal.toLowerCase() || countryVal.toLowerCase().includes(c.toLowerCase()));
      if (match) setCountry(match);
    }
    if (zip) setPostalCode(zip);
  }, []);

  const handleSelectPrediction = useCallback(async (pred) => {
    const pid = pred.place_id;
    const displayName = pred.structured_formatting?.main_text ?? pred.description ?? '';
    if (!pid) return;
    setBusinessName(displayName);
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
      svc.getDetails({ placeId: pid, fields: ['place_id','name','formatted_address','address_components','website','international_phone_number','formatted_phone_number','opening_hours','rating','user_ratings_total','types','business_status','photos'] }, (result, status) => {
        if (status === window.google.maps.places.PlacesServiceStatus.OK && result) {
          setPlaceData(result);
          if (result.address_components?.length) fillFromPlace(result);
        } else {
          setPlaceData({ place_id: pid, name: displayName });
        }
      });
    } else {
      setPlaceData({ place_id: pid, name: displayName });
    }
    // Auto-advance to step 2
    setTimeout(() => {
      setStep(2);
      setTimeout(() => emailInputRef.current?.focus(), 150);
    }, 300);
  }, [fillFromPlace]);

  useEffect(() => {
    const handler = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target) && businessInputRef.current && !businessInputRef.current.contains(e.target)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  useEffect(() => {
    if (!autocompleteReady || !businessName || placeId) {
      if (!businessName || placeId) { setSuggestions([]); setShowDropdown(false); }
      return;
    }
    const t = setTimeout(() => fetchSuggestions(businessName), 300);
    return () => clearTimeout(t);
  }, [businessName, placeId, autocompleteReady, fetchSuggestions]);

  const handleBusinessChange = (e) => {
    const v = e.target.value;
    setBusinessName(v);
    if (placeId) { setPlaceId(''); setPlaceData(null); setStreetAddress(''); }
    if (fallbackMode) { setFallbackMode(false); setFallbackCity(''); }
  };

  const handleEmailChange = (e) => {
    setEmail(e.target.value);
    setIsEmailValid(/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e.target.value));
  };

  const handleStep1Continue = () => {
    if (!businessName || businessName.trim().length < 2) { toast.error('Please enter your business name'); return; }
    if (!fallbackMode && !placeId) { toast.error('Please select your business from the dropdown'); return; }
    if (fallbackMode && !fallbackCity) { toast.error('Please enter your city'); return; }
    setStep(2);
    setTimeout(() => emailInputRef.current?.focus(), 150);
  };

  const handleScan = async () => {
    if (!isEmailValid) { toast.error('Please enter a valid email'); return; }

    fireTTQ('SubmitForm', { content_name: 'Free Visibility Scan', content_type: 'lead_form' });
    fireTTQ('Lead', { content_name: 'scan-b' });

    setIsScanning(true);

    const effectiveCity = fallbackMode ? fallbackCity : city;
    const cityParts = effectiveCity.split(',').map(s => s.trim());
    const scanPending = {
      placeId: placeId || undefined, placeData: serializePlaceData(placeData),
      businessName, city: cityParts[0] || 'Unknown', state: cityParts[1] || cityParts[0] || 'Unknown',
      country: country || undefined, email: email?.trim() || undefined,
      phone: placeData?.formatted_phone_number || placeData?.international_phone_number || undefined,
      postalCode: postalCode || undefined,
      streetAddress: streetAddress || placeData?.formatted_address,
      photoCount: (placeData?.photos || []).length || undefined,
    };
    sessionStorage.setItem(SCAN_PENDING_KEY, JSON.stringify(scanPending));
    try { if (email?.trim()) localStorage.setItem(SAVED_EMAIL_KEY, email.trim()); } catch (_) {}
    navigate(createPageUrl('ScanResults'), { replace: true });
  };

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <ScanLoadingOverlay isVisible={isScanning} businessName={businessName} />

      {/* Minimal header */}
      <div className="px-4 pt-6 pb-2 flex justify-center">
        <a href={createPageUrl('Landing')}>
          <AGSLogo className="h-8" />
        </a>
      </div>

      {/* Step indicator */}
      <div className="text-center pt-4 pb-2 flex items-center justify-center gap-3">
        <div className={cn("w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold", step >= 1 ? "bg-indigo-600 text-white" : "bg-slate-200 text-slate-500")}>1</div>
        <div className={cn("h-0.5 w-8 rounded", step >= 2 ? "bg-indigo-600" : "bg-slate-200")} />
        <div className={cn("w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold", step >= 2 ? "bg-indigo-600 text-white" : "bg-slate-200 text-slate-500")}>2</div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col items-center justify-center px-4 pb-12">
        <div className="w-full max-w-md">

          <AnimatePresence mode="wait">
            {step === 1 && (
              <motion.div
                key="step1"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.25 }}
              >
                <div className="text-center mb-8">
                  <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-2">
                    Where does your business rank right now?
                  </h1>
                  <p className="text-slate-500 text-sm">Find your business to get your free score</p>
                </div>

                <div className="bg-white rounded-2xl shadow-xl border border-slate-100 p-6">
                  <div ref={dropdownRef} className="relative">
                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">Your Business Name</label>
                    <div className="relative">
                      <input
                        ref={businessInputRef}
                        type="text"
                        value={businessName}
                        onChange={handleBusinessChange}
                        placeholder={autocompleteReady ? "Start typing your business name..." : "Loading..."}
                        autoComplete="off"
                        disabled={!autocompleteReady}
                        style={{ fontSize: '16px' }}
                        className={cn(
                          "w-full h-14 px-4 pr-10 border-2 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-400 transition-all",
                          placeId ? "border-green-500 bg-green-50/20" : "border-slate-200 bg-white"
                        )}
                      />
                      {placeId && <Check className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-green-600 pointer-events-none" />}
                      {isLoadingSuggestions && !placeId && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-blue-500 animate-spin pointer-events-none" />}

                      {showDropdown && suggestions.length > 0 && (
                        <div className="absolute z-[10000] w-full mt-1 bg-white border-2 border-blue-200 rounded-xl shadow-2xl max-h-72 overflow-y-auto">
                          {suggestions.map((pred, idx) => (
                            <button
                              key={pred.place_id ?? idx}
                              type="button"
                              onMouseDown={(e) => { e.preventDefault(); handleSelectPrediction(pred); }}
                              onTouchEnd={(e) => { e.preventDefault(); handleSelectPrediction(pred); }}
                              className="w-full px-4 py-3.5 text-left hover:bg-blue-50 active:bg-blue-100 border-b border-slate-100 last:border-b-0 first:rounded-t-xl last:rounded-b-xl min-h-[48px] flex flex-col justify-center"
                            >
                              <div className="font-semibold text-sm text-slate-900">{pred.structured_formatting?.main_text ?? pred.description}</div>
                              {pred.structured_formatting?.secondary_text && (
                                <div className="text-xs text-slate-500 mt-0.5 truncate">{pred.structured_formatting.secondary_text}</div>
                              )}
                            </button>
                          ))}
                          <button
                            type="button"
                            onMouseDown={(e) => { e.preventDefault(); setShowDropdown(false); setFallbackMode(true); }}
                            onTouchEnd={(e) => { e.preventDefault(); setShowDropdown(false); setFallbackMode(true); }}
                            className="w-full px-4 py-3 text-left text-xs text-slate-500 hover:bg-slate-50 last:rounded-b-xl min-h-[44px] flex items-center border-t border-slate-100"
                          >
                            Can't find your business? Enter manually →
                          </button>
                        </div>
                      )}
                    </div>

                    {placeId && (
                      <p className="mt-1 text-xs text-green-600 font-medium flex items-center gap-1">
                        <Check className="w-3 h-3" /> Found! Tap Continue →
                      </p>
                    )}
                  </div>

                  {fallbackMode && (
                    <div className="mt-4">
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

                  <button
                    type="button"
                    onClick={handleStep1Continue}
                    disabled={!businessName || (!placeId && !fallbackMode) || (fallbackMode && !fallbackCity)}
                    className={cn(
                      "w-full h-14 rounded-xl font-bold text-base text-white flex items-center justify-center gap-2 transition-all mt-4",
                      (businessName && (placeId || (fallbackMode && fallbackCity)))
                        ? "bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 shadow-lg hover:shadow-xl hover:-translate-y-0.5"
                        : "bg-slate-200 text-slate-400 cursor-not-allowed"
                    )}
                  >
                    Continue <ArrowRight className="w-5 h-5" />
                  </button>

                  <div className="flex items-center justify-center gap-4 mt-4">
                    <span className="text-xs text-slate-400 flex items-center gap-1"><Check className="w-3 h-3" /> Free</span>
                    <span className="text-xs text-slate-400 flex items-center gap-1"><Check className="w-3 h-3" /> 30 seconds</span>
                    <span className="text-xs text-slate-400 flex items-center gap-1"><Check className="w-3 h-3" /> No pitch</span>
                  </div>
                </div>
              </motion.div>
            )}

            {step === 2 && (
              <motion.div
                key="step2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.25 }}
              >
                <div className="text-center mb-8">
                  <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-green-100 mb-4">
                    <Check className="w-6 h-6 text-green-600" />
                  </div>
                  <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-1">
                    Got it — <span className="text-indigo-600">{businessName}</span>
                  </h1>
                  <p className="text-slate-500 text-sm">Last step: where should we send your results?</p>
                </div>

                <div className="bg-white rounded-2xl shadow-xl border border-slate-100 p-6">
                  <form onSubmit={(e) => { e.preventDefault(); handleScan(); }} className="space-y-4">
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                        <Mail className="w-4 h-4 inline mr-1" />
                        Your Email
                      </label>
                      <div className="relative">
                        <input
                          ref={emailInputRef}
                          type="email"
                          value={email}
                          onChange={handleEmailChange}
                          placeholder="you@yourbusiness.com"
                          required
                          style={{ fontSize: '16px' }}
                          className={cn(
                            "w-full h-14 px-4 pr-10 border-2 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-400 transition-all",
                            isEmailValid ? "border-green-500 bg-green-50/20" : "border-slate-200 bg-white"
                          )}
                        />
                        {isEmailValid && <Check className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-green-600 pointer-events-none" />}
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={isScanning || !isEmailValid}
                      className={cn(
                        "w-full h-14 rounded-xl font-bold text-base text-white flex items-center justify-center gap-2 transition-all",
                        isEmailValid && !isScanning
                          ? "bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 shadow-lg hover:shadow-xl hover:-translate-y-0.5"
                          : "bg-slate-200 text-slate-400 cursor-not-allowed"
                      )}
                    >
                      {isScanning ? (
                        <><Loader2 className="w-5 h-5 animate-spin" /> Running scan...</>
                      ) : (
                        <>Run My Free Scan <ArrowRight className="w-5 h-5" /></>
                      )}
                    </button>

                    <div className="flex items-center justify-center gap-4">
                      <span className="text-xs text-slate-400 flex items-center gap-1"><Check className="w-3 h-3" /> No credit card</span>
                      <span className="text-xs text-slate-400 flex items-center gap-1"><Check className="w-3 h-3" /> Instant results</span>
                    </div>
                  </form>

                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className="mt-4 w-full flex items-center justify-center gap-1 text-sm text-slate-400 hover:text-slate-600 transition-colors"
                  >
                    <ChevronLeft className="w-4 h-4" /> Change business
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
