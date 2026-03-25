// ============================================================================
// AGS - SMART BUSINESS SCANNER (Dynamic Scoring)
// Calls backend scanner with real MEO/GEO algorithm
// ============================================================================

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Building, 
  MapPin, 
  Globe, 
  Mail, 
  Sparkles, 
  Check, 
  Loader2,
  Zap,
  ArrowRight,
  AlertTriangle,
  Home
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast }  from 'sonner';
import { cn } from '@/lib/utils';
import { useGoogleMaps, useAutocompleteService } from '@/components/utils/useGoogleMaps';
import ScanLoadingOverlay from '@/components/ScanLoadingOverlay';
import { createPageUrl } from '@/utils';

// Global country list
const COUNTRIES = [
  "United States", "Canada", "United Kingdom", "Australia", "Germany", "France",
  "Spain", "Italy", "Netherlands", "Belgium", "Switzerland", "Austria",
  "Sweden", "Norway", "Denmark", "Finland", "Ireland", "Portugal", "Poland",
  "Japan", "South Korea", "Singapore", "Hong Kong", "Taiwan", "China",
  "India", "United Arab Emirates", "Saudi Arabia", "Israel", "Turkey",
  "Brazil", "Mexico", "Argentina", "Chile", "Colombia",
  "South Africa", "Nigeria", "Kenya", "Egypt",
  "New Zealand", "Philippines", "Thailand", "Malaysia", "Indonesia", "Vietnam"
].sort();

const SAVED_EMAIL_KEY = 'scan_saved_email';
const SCAN_PENDING_KEY = 'scanPending';

/** Serialize place data for sessionStorage (Google Places objects may have non-JSON-serializable fields) */
function serializePlaceData(place) {
  if (!place) return null;
  try {
    const safe = {
      place_id: place.place_id,
      name: place.name,
      formatted_address: place.formatted_address,
      address_components: place.address_components,
      website: place.website,
      international_phone_number: place.international_phone_number,
      formatted_phone_number: place.formatted_phone_number,
      opening_hours: place.opening_hours,
      rating: place.rating,
      user_ratings_total: place.user_ratings_total,
      types: place.types,
      business_status: place.business_status,
    };
    return JSON.parse(JSON.stringify(safe));
  } catch {
    return { place_id: place.place_id, name: place.name, formatted_address: place.formatted_address };
  }
}

export default function FrontendOnlyScanner({ onScanComplete, scanMode = 'local', onBusinessNameChange, onUrlChange }) {
  const navigate = useNavigate();
  // Form state - pre-fill email from localStorage (saved from previous scan)
  const [email, setEmail] = useState(() => {
    try {
      const saved = localStorage.getItem(SAVED_EMAIL_KEY);
      return typeof saved === 'string' && saved.trim() ? saved.trim() : '';
    } catch {
      return '';
    }
  });
  const [url, setUrl] = useState('');
  const [isUrlValid, setIsUrlValid] = useState(false);
  const [businessName, setBusinessName] = useState('');
  const [streetAddress, setStreetAddress] = useState('');
  const [city, setCity] = useState('');
  const [country, setCountry] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [placeId, setPlaceId] = useState('');
  const [placeData, setPlaceData] = useState(null);

  // UI state
  const [isEmailValid, setIsEmailValid] = useState(() => {
    try {
      const saved = localStorage.getItem(SAVED_EMAIL_KEY);
      if (typeof saved !== 'string' || !saved.trim()) return false;
      const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      return regex.test(saved.trim());
    } catch {
      return false;
    }
  });
  const [isScanning, setIsScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState('');
  const [autoFilledFields, setAutoFilledFields] = useState([]);
  
  // Autocomplete state
  const [suggestions, setSuggestions] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);

  // Refs
  const businessInputRef = useRef(null);
  const dropdownRef = useRef(null);

  // ========================================
  // Load Google Maps API using shared hook
  // ========================================
  const { isLoaded: mapsLoaded, error: mapsError } = useGoogleMaps();

  // ========================================
  // AutocompleteService + custom dropdown (avoids Google widget blur/click race)
  // ========================================
  const { getPredictions, isLoaded: autocompleteReady } = useAutocompleteService();

  const fetchSuggestions = useCallback(async (query) => {
    if (!query || query.length < 2 || !getPredictions) {
      setSuggestions([]);
      setShowDropdown(false);
      return;
    }
    setIsLoadingSuggestions(true);
    try {
      const preds = await getPredictions(query);
      setSuggestions(preds || []);
      setShowDropdown((preds?.length ?? 0) > 0);
    } catch {
      setSuggestions([]);
      setShowDropdown(false);
    } finally {
      setIsLoadingSuggestions(false);
    }
  }, [getPredictions]);

  // ========================================
  // Handle place selection from autocomplete
  // ========================================
  const fillFromPlace = useCallback((place, isFromDetails = false) => {
    const components = place?.address_components || [];
    const getComp = (type, short = false) => {
      const c = components.find(x => x.types?.includes(type));
      return c ? (short ? c.short_name : c.long_name) : '';
    };
    const streetNumber = getComp('street_number');
    const route = getComp('route');
    const street = [streetNumber, route].filter(Boolean).join(' ').trim();
    const cityVal = getComp('locality');
    const state = getComp('administrative_area_level_1', true);
    const countryVal = getComp('country');
    const zip = getComp('postal_code');
    const filled = [];
    if (street) {
      setStreetAddress(street);
      filled.push('street');
    } else if (place?.formatted_address) {
      const firstLine = place.formatted_address.split(',')[0]?.trim();
      if (firstLine) {
        setStreetAddress(firstLine);
        filled.push('street');
      }
    }
    if (cityVal) {
      setCity(state ? `${cityVal}, ${state}` : cityVal);
      filled.push('city');
    }
    if (countryVal) {
      const match = COUNTRIES.find(c =>
        c.toLowerCase() === countryVal.toLowerCase() ||
        c.toLowerCase().includes(countryVal.toLowerCase()) ||
        countryVal.toLowerCase().includes(c.toLowerCase())
      );
      if (match) {
        setCountry(match);
        filled.push('country');
      }
    }
    if (zip) {
      setPostalCode(zip);
      filled.push('postal');
    }
    setAutoFilledFields(prev => [...new Set([...prev, ...filled])]);
    return filled.length > 0;
  }, []);

  const handleSelectPrediction = useCallback(async (prediction) => {
    const placeId = prediction.place_id;
    const displayName = prediction.structured_formatting?.main_text ?? prediction.description ?? '';

    if (!placeId) return;

    setBusinessName(displayName);
    if (onBusinessNameChange) onBusinessNameChange(displayName);
    setPlaceId(placeId);
    setShowDropdown(false);
    setSuggestions([]);

    const filled = [];
    const secondary = prediction.structured_formatting?.secondary_text ?? '';
    if (secondary) {
      const parts = secondary.split(',').map(s => s.trim());
      if (parts[0]) {
        setCity(parts[0]);
        filled.push('city');
      }
      const lastPart = parts[parts.length - 1];
      const match = COUNTRIES.find(c =>
        c.toLowerCase() === lastPart?.toLowerCase() || lastPart?.toLowerCase().includes(c.toLowerCase())
      );
      if (match) {
        setCountry(match);
        filled.push('country');
      }
    }
    setAutoFilledFields(filled);

    if (window.google?.maps?.places?.PlacesService) {
      const mapDiv = document.createElement('div');
      const service = new window.google.maps.places.PlacesService(new window.google.maps.Map(mapDiv));
      service.getDetails(
        {
          placeId,
          fields: ['place_id', 'name', 'formatted_address', 'address_components', 'geometry', 'website', 'international_phone_number', 'formatted_phone_number', 'opening_hours', 'rating', 'user_ratings_total', 'types', 'business_status', 'photos']
        },
        (result, status) => {
          if (status === window.google.maps.places.PlacesServiceStatus.OK && result) {
            setPlaceData(result);
            if (result.address_components?.length) {
              fillFromPlace(result, true);
            }
          } else {
            setPlaceData({ place_id: placeId, name: displayName });
          }
        }
      );
    } else {
      setPlaceData({ place_id: placeId, name: displayName });
    }
  }, [fillFromPlace, onBusinessNameChange]);


  // ========================================
  // Close dropdown when clicking outside
  // ========================================
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        dropdownRef.current && 
        !dropdownRef.current.contains(event.target) &&
        businessInputRef.current &&
        !businessInputRef.current.contains(event.target)
      ) {
        setShowDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Debounce fetch when user types (skip when placeId is set = already selected)
  useEffect(() => {
    if (!autocompleteReady || !businessName || placeId) {
      if (!businessName || placeId) {
        setSuggestions([]);
        setShowDropdown(false);
      }
      return;
    }
    const t = setTimeout(() => fetchSuggestions(businessName), 300);
    return () => clearTimeout(t);
  }, [businessName, placeId, autocompleteReady, fetchSuggestions]);

  // ========================================
  // Email validation
  // ========================================
  const handleEmailChange = (e) => {
    const value = e.target.value;
    setEmail(value);
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    setIsEmailValid(regex.test(value));
  };

  const handleUrlChange = (e) => {
    const value = e.target.value;
    setUrl(value);
    if (onUrlChange) onUrlChange(value);
    try {
      new URL(value);
      setIsUrlValid(true);
    } catch {
      setIsUrlValid(false);
    }
  };

  // Note: Google Maps Autocomplete widget handles suggestions automatically
  // No need for manual fetchSuggestions when using the widget

  // ========================================
  // Handle business name input
  // ========================================
  const handleBusinessNameChange = (e) => {
    const value = e.target.value;
    setBusinessName(value);
    if (onBusinessNameChange) onBusinessNameChange(value);
    if (placeId) {
      setPlaceId('');
      setPlaceData(null);
      setStreetAddress('');
      setAutoFilledFields([]);
    }
  };


  // ========================================
  // Run Online Scan
  // ========================================
  const handleOnlineScan = async () => {
    console.log('=== ONLINE SCAN INITIATED ===');

    if (!isEmailValid) {
      toast.error('Please enter a valid email address');
      return;
    }

    if (!isUrlValid) {
      toast.error('Please enter a valid URL (include https://)');
      return;
    }

    setIsScanning(true);
    setScanProgress('Analyzing website signals...');

    try {
      const response = await fetch('/functions/runOnlineScan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url, email })
      });

      const text = await response.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch (e) {
        // This catches the "Deployment..." or non-JSON error
        console.error("Raw response:", text);
        throw new Error(`Scanner error: ${text.substring(0, 100)}`);
      }
      
      if (!data.success) {
        throw new Error(data.error || 'Scan failed');
      }

      console.log('✅ Online scan result:', data.result);
      
      // Save email for pre-fill on next scan
      try {
        if (email && typeof email === 'string' && email.trim()) {
          localStorage.setItem(SAVED_EMAIL_KEY, email.trim());
        }
      } catch (_) {}
      
      if (onScanComplete) {
        // Ensure email is passed from state
        onScanComplete({ ...data.result, email });
      }

    } catch (error) {
      console.error('❌ Scan error:', error);
      toast.error(error.message);
    } finally {
      setIsScanning(false);
      setScanProgress('');
    }
  };

  // ========================================
  // Run Dynamic Scan with REAL AI visibility
  // ========================================
  const handleScan = async () => {
    if (scanMode === 'online') {
      handleOnlineScan();
      return;
    }

    console.log('=== SCAN INITIATED (Real AI Visibility Checks) ===');

    // Validation
    if (!isEmailValid) {
      toast.error('Please enter a valid email address');
      return;
    }

    if (!businessName || businessName.trim().length < 2) {
      toast.error('Please enter a business name');
      return;
    }

    if (!country) {
      toast.error('Please select a country');
      return;
    }

    if (!placeId) {
      toast.error('Please select a business from the dropdown');
      return;
    }

    // Parse city and state
    const cityParts = city.split(',').map(s => s.trim());
    const cityName = cityParts[0] || 'Unknown';
    const stateName = cityParts[1] || cityName;

    // Store scan params and navigate immediately - user sees loading screen right away
    const scanPending = {
      placeId,
      placeData: serializePlaceData(placeData),
      businessName,
      city: cityName,
      state: stateName,
      country,
      email: email?.trim() || undefined,
      phone: placeData?.formatted_phone_number || placeData?.international_phone_number || undefined,
      postalCode: postalCode || undefined,
      streetAddress: streetAddress || placeData?.formatted_address,
      photoCount: (placeData?.photos || []).length || undefined,
    };

    sessionStorage.setItem(SCAN_PENDING_KEY, JSON.stringify(scanPending));

    // Save email for pre-fill on next scan
    try {
      if (email && typeof email === 'string' && email.trim()) {
        localStorage.setItem(SAVED_EMAIL_KEY, email.trim());
      }
    } catch (_) {}

    // Navigate immediately so user sees loading screen (ScanResults will run the scan)
    navigate(createPageUrl('ScanResults'), { replace: true });
  };

  // ========================================
  // Render
  // ========================================
  return (
    <>
      <ScanLoadingOverlay
        isVisible={isScanning}
        progress={scanProgress}
        businessName={businessName}
      />
    <Card className="max-w-3xl mx-auto shadow-2xl border-0 bg-white/90 backdrop-blur-xl rounded-3xl overflow-visible">
      <CardContent className="p-8 lg:p-10 overflow-visible">
        
        {/* Info Banner */}
        <div className="mb-6 p-4 bg-gradient-to-r from-blue-50/80 to-slate-50 border-2 border-blue-200/60 rounded-xl">
          <div className="flex items-center gap-3">
            <Sparkles className="w-5 h-5 text-blue-600" />
            <div>
              <p className="font-bold text-blue-900 text-sm flex items-center gap-2"><Sparkles className="w-4 h-4" /> Smart Search Enabled</p>
              <p className="text-blue-700 text-xs">
                Type your business name and select from the dropdown to auto-fill everything!
              </p>
            </div>
          </div>
        </div>

        <form onSubmit={(e) => { e.preventDefault(); handleScan(); }} className="space-y-6 overflow-visible">
          
          {/* Email - Common for both modes */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              <Mail className="w-4 h-4 inline mr-1" />
              Your Email *
            </label>
            <div className="relative">
              <Input
                type="email"
                value={email}
                onChange={handleEmailChange}
                placeholder="email@example.com"
                className={cn(
                  "h-12 text-base transition-all border-2 rounded-xl",
                  isEmailValid ? "border-green-500 bg-green-50/30" : "border-slate-300"
                )}
                required
              />
              {isEmailValid && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  <Check className="w-5 h-5 text-green-600" />
                </div>
              )}
            </div>
          </div>

          {scanMode === 'local' ? (
            <>
              {/* Local Business Form Inputs */}
              <div ref={dropdownRef} className="relative">
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  <Building className="w-4 h-4 inline mr-1" />
                  Business Name *
                  <Badge className="ml-2 bg-blue-100 text-blue-700">
                    Smart Search
                  </Badge>
                </label>
                <div className="relative">
                  <Input
                    ref={businessInputRef}
                    type="text"
                    value={businessName}
                    onChange={(e) => handleBusinessNameChange(e)}
                    placeholder={autocompleteReady ? "Type to search: e.g., Starbucks Dubai Mall" : "Loading search... (one moment)"}
                    className="h-12 text-base border-2 border-slate-300 rounded-xl"
                    autoComplete="off"
                    required
                    disabled={!autocompleteReady}
                  />
                  {(isLoadingSuggestions || (showDropdown && suggestions.length > 0)) && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                      {isLoadingSuggestions ? (
                        <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
                      ) : null}
                    </div>
                  )}
                  {showDropdown && suggestions.length > 0 && (
                    <div className="absolute z-[10000] w-full mt-1 bg-white border-2 border-blue-200 rounded-xl shadow-xl max-h-64 overflow-y-auto">
                      {suggestions.map((pred, idx) => (
                        <button
                          key={pred.place_id ?? idx}
                          type="button"
                          onMouseDown={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            handleSelectPrediction(pred);
                          }}
                          className="w-full px-4 py-3 text-left hover:bg-blue-50 active:bg-blue-100 transition-colors border-b border-slate-100 last:border-b-0 first:rounded-t-xl last:rounded-b-xl"
                        >
                          <div className="font-semibold text-sm text-slate-900">
                            {pred.structured_formatting?.main_text ?? pred.description}
                          </div>
                          {pred.structured_formatting?.secondary_text && (
                            <div className="text-xs text-slate-500 mt-0.5">
                              {pred.structured_formatting.secondary_text}
                            </div>
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  <Home className="w-4 h-4 inline mr-1" />
                  Street Address
                  {autoFilledFields.includes('street') && (
                    <><Check className="ml-2 w-3 h-3 text-green-600 inline" /> <span className="text-green-600 text-xs">Auto-filled</span></>
                  )}
                </label>
                <Input
                  type="text"
                  value={streetAddress}
                  onChange={(e) => {
                    setStreetAddress(e.target.value);
                    setAutoFilledFields(prev => prev.filter(f => f !== 'street'));
                  }}
                  placeholder="e.g., 123 Main St"
                  className={cn(
                    "h-12 text-base border-2 rounded-xl",
                    autoFilledFields.includes('street') ? "border-green-300 bg-green-50/30" : "border-slate-300"
                  )}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    <MapPin className="w-4 h-4 inline mr-1" />
                    City / Region
                    {autoFilledFields.includes('city') && (
                      <><Check className="ml-2 w-3 h-3 text-green-600 inline" /> <span className="text-green-600 text-xs">Auto-filled</span></>
                    )}
                  </label>
                  <Input
                    type="text"
                    value={city}
                    onChange={(e) => {
                      setCity(e.target.value);
                      setAutoFilledFields(prev => prev.filter(f => f !== 'city'));
                    }}
                    placeholder="e.g., Dubai"
                    className={cn(
                      "h-12 text-base border-2 rounded-xl",
                      autoFilledFields.includes('city') ? "border-green-300 bg-green-50/30" : "border-slate-300"
                    )}
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    <Globe className="w-4 h-4 inline mr-1" />
                    Country *
                    {autoFilledFields.includes('country') && (
                      <><Check className="ml-2 w-3 h-3 text-green-600 inline" /> <span className="text-green-600 text-xs">Auto-filled</span></>
                    )}
                  </label>
                  <Select
                    value={country}
                    onValueChange={(value) => {
                      setCountry(value);
                      setAutoFilledFields(prev => prev.filter(f => f !== 'country'));
                    }}
                  >
                    <SelectTrigger className={cn(
                      "h-12 text-base border-2 rounded-xl",
                      autoFilledFields.includes('country') ? "border-green-300 bg-green-50/30" : "border-slate-300"
                    )}>
                      <SelectValue placeholder="Select country" />
                    </SelectTrigger>
                    <SelectContent className="max-h-[300px]">
                      {COUNTRIES.map((c) => (
                        <SelectItem key={c} value={c}>{c}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Postal Code <span className="text-slate-400">(optional)</span>
                  {autoFilledFields.includes('postal') && (
                    <><Check className="ml-2 w-3 h-3 text-green-600 inline" /> <span className="text-green-600 text-xs">Auto-filled</span></>
                  )}
                </label>
                <Input
                  type="text"
                  value={postalCode}
                  onChange={(e) => {
                    setPostalCode(e.target.value);
                    setAutoFilledFields(prev => prev.filter(f => f !== 'postal'));
                  }}
                  placeholder="e.g., 10117"
                  className={cn(
                    "h-12 text-base border-2 rounded-xl",
                    autoFilledFields.includes('postal') ? "border-green-300 bg-green-50/30" : "border-slate-300"
                  )}
                />
              </div>
            </>
          ) : (
            /* Online Business Form Input */
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                <Globe className="w-4 h-4 inline mr-1" />
                Website URL *
              </label>
              <div className="relative">
                <Input
                  type="url"
                  value={url}
                  onChange={handleUrlChange}
                  placeholder="https://example.com"
                  className={cn(
                    "h-12 text-base transition-all border-2 rounded-xl",
                    isUrlValid ? "border-green-500 bg-green-50/30" : "border-slate-300"
                  )}
                  required
                />
                {isUrlValid && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    <Check className="w-5 h-5 text-green-600" />
                  </div>
                )}
              </div>
              <p className="text-xs text-slate-500 mt-2">
                Powered by AI — we analyze your site, presence in AI answers, and visibility signals across the web.
              </p>
            </div>
          )}

          {/* Submit Button */}
          <Button
            type="submit"
            disabled={isScanning || !isEmailValid || (scanMode === 'local' ? (!businessName || !country || !placeId) : !isUrlValid)}
            className={cn(
              "w-full h-14 text-base font-semibold rounded-xl transition-all",
              isScanning
                ? "bg-theme-gradient opacity-70 cursor-not-allowed"
                : (!isEmailValid || (scanMode === 'local' ? (!businessName || !country || !placeId) : !isUrlValid))
                  ? "bg-theme-gradient opacity-50 cursor-not-allowed"
                  : "bg-theme-gradient hover:shadow-xl hover:-translate-y-1"
            )}
          >
            {isScanning ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                {scanProgress || 'Scanning...'}
              </>
            ) : (
              <>
                <Zap className="w-5 h-5 mr-2" />
                Run Free Scan
                <ArrowRight className="w-5 h-5 ml-2" />
              </>
            )}
          </Button>

          {scanMode === 'local' && !placeId && businessName && businessName.length >= 2 && (
            <p className="text-center text-sm text-purple-600 flex items-center justify-center gap-1">
              <AlertTriangle className="w-4 h-4" /> Please select your business from the dropdown above to enable scanning
            </p>
          )}

        </form>
      </CardContent>
    </Card>
    </>
  );
}