// ============================================================================
// AGS - Smart Business Scanner Component
// Complete reset - no legacy code - production ready
// ============================================================================

import React, { useState, useEffect, useRef } from 'react';
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
  AlertTriangle,
  Zap,
  ArrowRight
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

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

// ============================================================================
// GOOGLE MAPS LOADER - Loads script once globally
// ============================================================================
let isGoogleMapsLoaded = false;
let googleMapsLoadPromise = null;

async function loadGoogleMaps() {
  if (isGoogleMapsLoaded) {
    return Promise.resolve();
  }

  if (googleMapsLoadPromise) {
    return googleMapsLoadPromise;
  }

  googleMapsLoadPromise = new Promise(async (resolve, reject) => {
    try {
      // Check if already loaded
      if (window.google?.maps?.places) {
        isGoogleMapsLoaded = true;
        resolve();
        return;
      }

      // Get API key from config
      const { PLACES_API_KEY } = await import('@/config/apiKeys');
      const apiKey = PLACES_API_KEY;
      
      if (!apiKey) {
        reject(new Error('API key not configured'));
        return;
      }

      // Load script
      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places&callback=initGoogleMaps`;
      script.async = true;
      script.defer = true;

      window.initGoogleMaps = () => {
        isGoogleMapsLoaded = true;
        resolve();
      };

      script.onerror = () => reject(new Error('Failed to load Google Maps'));
      document.head.appendChild(script);

    } catch (error) {
      reject(error);
    }
  });

  return googleMapsLoadPromise;
}

// ============================================================================
// SMART BUSINESS SCANNER COMPONENT
// ============================================================================
export default function SmartBusinessScanner({ onScanComplete }) {
  // Form state
  const [email, setEmail] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [city, setCity] = useState('');
  const [country, setCountry] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [placeId, setPlaceId] = useState('');

  // UI state
  const [isEmailValid, setIsEmailValid] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [mapsLoaded, setMapsLoaded] = useState(false);
  const [mapsError, setMapsError] = useState(null);
  const [autoFilledFields, setAutoFilledFields] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);

  // Refs
  const businessInputRef = useRef(null);
  const dropdownRef = useRef(null);
  const autocompleteServiceRef = useRef(null);

  // ========================================
  // Load Google Maps on mount
  // ========================================
  useEffect(() => {
    loadGoogleMaps()
      .then(() => setMapsLoaded(true))
      .catch((error) => {
        console.warn('Google Maps failed to load:', error);
        setMapsError(error.message);
      });
  }, []);

  // ========================================
  // AutocompleteService + custom dropdown (avoids Google widget blur/click race)
  // ========================================
  useEffect(() => {
    if (mapsLoaded && window.google?.maps?.places) {
      autocompleteServiceRef.current = new window.google.maps.places.AutocompleteService();
    }
  }, [mapsLoaded]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchSuggestions = (query) => {
    if (!query || query.length < 2 || !autocompleteServiceRef.current) {
      setSuggestions([]);
      setShowDropdown(false);
      return;
    }
    setIsLoadingSuggestions(true);
    autocompleteServiceRef.current.getPlacePredictions(
      { input: query, types: ['establishment'] },
      (preds, status) => {
        setIsLoadingSuggestions(false);
        if (status === window.google.maps.places.PlacesServiceStatus.OK && preds?.length) {
          setSuggestions(preds);
          setShowDropdown(true);
        } else {
          setSuggestions([]);
          setShowDropdown(false);
        }
      }
    );
  };

  const handleSelectPrediction = (prediction) => {
    const placeId = prediction.place_id;
    const displayName = prediction.structured_formatting?.main_text ?? prediction.description ?? '';
    if (!placeId) return;

    setBusinessName(displayName);
    setPlaceId(placeId);
    setShowDropdown(false);
    setSuggestions([]);

    const secondary = prediction.structured_formatting?.secondary_text ?? '';
    if (secondary) {
      const parts = secondary.split(',').map(s => s.trim());
      if (parts[0]) setCity(parts[0]);
      const lastPart = parts[parts.length - 1];
      const match = COUNTRIES.find(c =>
        c.toLowerCase() === lastPart?.toLowerCase() || lastPart?.toLowerCase().includes(c.toLowerCase())
      );
      if (match) setCountry(match);
    }

    if (window.google?.maps?.places?.PlacesService) {
      const mapDiv = document.createElement('div');
      const service = new window.google.maps.places.PlacesService(new window.google.maps.Map(mapDiv));
      service.getDetails(
        { placeId, fields: ['place_id', 'name', 'formatted_address', 'address_components', 'geometry'] },
        (result, status) => {
          if (status === window.google.maps.places.PlacesServiceStatus.OK && result?.address_components?.length) {
            const getComp = (type, short = false) => {
              const c = result.address_components.find(x => x.types?.includes(type));
              return c ? (short ? c.short_name : c.long_name) : '';
            };
            const filled = [];
            const cityVal = getComp('locality');
            const stateVal = getComp('administrative_area_level_1', true);
            const zipVal = getComp('postal_code');
            const countryVal = getComp('country');
            if (cityVal) {
              setCity(stateVal ? `${cityVal}, ${stateVal}` : cityVal);
              filled.push('city');
            }
            if (countryVal) {
              const m = COUNTRIES.find(c =>
                c.toLowerCase() === countryVal.toLowerCase() ||
                c.toLowerCase().includes(countryVal.toLowerCase()) ||
                countryVal.toLowerCase().includes(c.toLowerCase())
              );
              if (m) {
                setCountry(m);
                filled.push('country');
              }
            }
            if (zipVal) {
              setPostalCode(zipVal);
              filled.push('postal');
            }
            setAutoFilledFields(prev => [...new Set([...prev, ...filled])]);
          }
        }
      );
    }
  };

  const debounceRef = useRef(null);
  const handleBusinessInputChange = (e) => {
    const v = e.target.value;
    setBusinessName(v);
    if (placeId) {
      setPlaceId('');
      setAutoFilledFields([]);
    }
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchSuggestions(v), 300);
  };

  // ========================================
  // Email validation
  // ========================================
  const handleEmailChange = (e) => {
    const value = e.target.value;
    setEmail(value);
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    setIsEmailValid(regex.test(value));
  };

  // ========================================
  // Run scan
  // ========================================
  const handleScan = async () => {
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

    setIsScanning(true);

    try {
      // Call scanner function directly (include email/phone for lead capture)
      const { scanner } = await import('@/api/functions');
      const data = await scanner({
        place_id: placeId || null,
        business_name: businessName,
        location: city || 'Unknown',
        country: country,
        city: city,
        state: city.split(',')[1]?.trim() || null,
        email: email?.trim() || undefined,
        phone: undefined,
        zipCode: postalCode || undefined
      });

      if (!data.success || !data.place) {
        toast.error(data.error || 'Scan failed. Please try again.');
        setIsScanning(false);
        return;
      }

      // Success!
      toast.success('✅ Business found! Analyzing visibility...');

      // Pass data to parent component
      if (onScanComplete) {
        onScanComplete({
          email: email,
          business: data.place,
          metadata: {
            city: city,
            country: country,
            postal: postalCode
          }
        });
      }

    } catch (error) {
      console.error('Scan error:', error);
      toast.error('Connection error. Please try again.');
    } finally {
      setIsScanning(false);
    }
  };

  // ========================================
  // Render
  // ========================================
  return (
    <Card className="max-w-3xl mx-auto shadow-2xl border-0 bg-white/90 backdrop-blur-xl rounded-3xl">
      <CardContent className="p-8 lg:p-10">
        
        {/* Maps Status Banner */}
        {mapsLoaded && !mapsError && (
          <div className="mb-6 p-4 bg-green-50 border-2 border-green-200 rounded-xl">
            <div className="flex items-center gap-3">
              <Sparkles className="w-5 h-5 text-green-600" />
              <div>
                <p className="font-bold text-green-900 text-sm flex items-center gap-2"><Sparkles className="w-4 h-4" /> Smart Search Active</p>
                <p className="text-green-700 text-xs">
                  Type your business name below — we'll auto-fill everything from Google Places!
                </p>
              </div>
            </div>
          </div>
        )}

        {mapsError && (
          <div className="mb-6 p-4 bg-amber-50 border-2 border-amber-200 rounded-xl">
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-600" />
              <div>
                <p className="font-bold text-amber-900 text-sm">Manual Entry Mode</p>
                <p className="text-amber-700 text-xs">
                  Smart search unavailable. You can still enter details manually.
                </p>
              </div>
            </div>
          </div>
        )}

        <form onSubmit={(e) => { e.preventDefault(); handleScan(); }} className="space-y-6">
          
          {/* Email */}
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

          {/* Business Name */}
          <div ref={dropdownRef} className="relative">
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              <Building className="w-4 h-4 inline mr-1" />
              Business Name *
              {mapsLoaded && (
                <Badge className="ml-2 bg-purple-100 text-purple-700">
                  Smart Search
                </Badge>
              )}
            </label>
            <div className="relative">
              <Input
                ref={businessInputRef}
                type="text"
                value={businessName}
                onChange={handleBusinessInputChange}
                placeholder={mapsLoaded ? "Type to search: e.g., Starbucks Dubai" : "Enter business name"}
                className="h-12 text-base border-2 border-slate-300 rounded-xl"
                autoComplete="off"
                required
              />
              {isLoadingSuggestions && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  <Loader2 className="w-5 h-5 animate-spin text-purple-600" />
                </div>
              )}
              {showDropdown && suggestions.length > 0 && (
                <div className="absolute z-[9999] w-full mt-1 bg-white border-2 border-slate-200 rounded-xl shadow-xl max-h-64 overflow-y-auto">
                  {suggestions.map((pred, idx) => (
                    <button
                      key={pred.place_id ?? idx}
                      type="button"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handleSelectPrediction(pred);
                      }}
                      className="w-full px-4 py-3 text-left hover:bg-slate-50 active:bg-slate-100 transition-colors border-b border-slate-100 last:border-b-0 first:rounded-t-xl last:rounded-b-xl"
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
            {placeId && (
              <p className="text-xs text-green-600 mt-1 flex items-center gap-1">
                <Check className="w-3 h-3" />
                Verified from Google Places
              </p>
            )}
          </div>

          {/* City & Country */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                <MapPin className="w-4 h-4 inline mr-1" />
                City / Region
                {autoFilledFields.includes('city') && (
                  <Check className="ml-2 w-3 h-3 text-green-600 inline" />
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
                  <Check className="ml-2 w-3 h-3 text-green-600 inline" />
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

          {/* Postal Code */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              Postal Code <span className="text-slate-400">(optional)</span>
              {autoFilledFields.includes('postal') && (
                <Check className="ml-2 w-3 h-3 text-green-600 inline" />
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

          {/* Submit Button */}
          <Button
            type="submit"
            disabled={isScanning || !isEmailValid || !businessName || !country}
            className={cn(
              "w-full h-14 text-base font-semibold rounded-xl transition-all",
              isScanning
                ? "bg-theme-gradient opacity-70 cursor-not-allowed"
                : !isEmailValid || !businessName || !country
                  ? "bg-theme-gradient opacity-50 cursor-not-allowed"
                  : "bg-theme-gradient hover:shadow-xl hover:-translate-y-1"
            )}
          >
            {isScanning ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                Scanning...
              </>
            ) : (
              <>
                <Zap className="w-5 h-5 mr-2" />
                Run Free Scan
                <ArrowRight className="w-5 h-5 ml-2" />
              </>
            )}
          </Button>

        </form>
      </CardContent>
    </Card>
  );
}