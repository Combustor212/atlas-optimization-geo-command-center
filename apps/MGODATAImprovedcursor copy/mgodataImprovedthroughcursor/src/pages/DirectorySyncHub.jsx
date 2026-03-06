
import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Globe,
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
  Download,
  Loader2,
  Sparkles,
  Check,
  Info
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

// Load Google Maps API key from config
async function loadApiKey() {
  try {
    console.log("🔑 Frontend: Loading API key from config...");
    const { PLACES_API_KEY } = await import('@/config/apiKeys');
    const apiKey = PLACES_API_KEY;
    
    if (apiKey && apiKey.length > 0) {
      console.log("✅ Frontend: API key loaded successfully");
      return apiKey;
    } else {
      console.error("❌ Frontend: API key not configured");
      return "";
    }
  } catch (error) {
    console.error("❌ Frontend: Failed to load API key:", error);
    return "";
  }
}

// Load Google Maps Script with better error handling
function useGoogleMapsScript() {
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Check if already loaded
    if (window.google && window.google.maps && window.google.maps.places) {
      console.log("✅ Frontend: Google Maps already loaded");
      setIsLoaded(true);
      return;
    }

    // Load API key first
    loadApiKey().then(key => {
      if (!key) {
        console.warn("⚠️ Frontend: Google Maps API Key is missing. Autocomplete will not work.");
        setError("Google Maps API key not configured");
        return;
      }

      console.log("🗺️ Frontend: Loading Google Maps script...");
      
      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=${key}&libraries=places`;
      script.async = true;
      script.defer = true;
      script.onload = () => {
        console.log("✅ Frontend: Google Maps API loaded successfully");
        setIsLoaded(true);
      };
      script.onerror = () => {
        console.error("❌ Frontend: Failed to load Google Maps API");
        setError("Failed to load Google Maps");
      };
      document.head.appendChild(script);
    });

    return () => {
      const existingScript = document.querySelector('script[src*="maps.googleapis.com"]');
      if (existingScript && existingScript.parentNode) {
        existingScript.parentNode.removeChild(existingScript);
      }
    };
  }, []);

  return { isLoaded, error };
}

// Google Places Autocomplete Hook
function usePlacesAutocomplete(inputRef, onPlaceSelected) {
  const autocompleteRef = useRef(null);

  useEffect(() => {
    // Only initialize if Google Maps is loaded and inputRef is available
    if (!window.google || !window.google.maps || !window.google.maps.places || !inputRef.current) return;

    try {
      autocompleteRef.current = new window.google.maps.places.Autocomplete(inputRef.current, {
        fields: ["name", "formatted_address", "address_components", "website", "types", "place_id", "international_phone_number"],
        types: ["establishment"],
        componentRestrictions: { country: "us" }
      });

      autocompleteRef.current.addListener("place_changed", () => {
        const place = autocompleteRef.current.getPlace();
        if (!place || !place.place_id) return;

        console.log("🎯 Place selected:", place);

        const getAddressComponent = (type, short = false) =>
          place.address_components?.find((c) => c.types.includes(type))?.[short ? 'short_name' : 'long_name'] || "";

        const streetNumber = getAddressComponent("street_number");
        const route = getAddressComponent("route");
        const street = [streetNumber, route].filter(Boolean).join(" ");
        const city = getAddressComponent("locality");
        const state = getAddressComponent("administrative_area_level_1", true); // short_name for state
        const zip = getAddressComponent("postal_code");
        const country = getAddressComponent("country", true); // short_name for country

        const placeData = {
          business_name: place.name || "",
          street_address: street || "",
          city: city || "",
          state: state || "",
          zip_code: zip || "",
          country: country || "USA", // Default to USA if country not found
          phone: place.international_phone_number || "",
          website: place.website || "",
          industry: place.types?.[0]?.replace(/_/g, " ") || "", // First type as industry, clean up underscores
          place_id: place.place_id
        };

        console.log("✅ Extracted data:", placeData);
        onPlaceSelected(placeData);
      });
    } catch (error) {
      console.error("❌ Autocomplete initialization error:", error);
    }

    return () => {
      if (autocompleteRef.current) {
        // Remove listener to prevent memory leaks, though Google's library often handles this
        window.google.maps.event.clearInstanceListeners(autocompleteRef.current);
      }
    };
  }, [inputRef, onPlaceSelected]);
}

// Directory Status Card
const DirectoryStatusCard = ({ directory }) => {
  const getStatusConfig = () => {
    switch (directory.status) {
      case 'Synced':
        return {
          icon: CheckCircle2,
          color: 'text-green-600',
          bgColor: 'bg-green-50',
          borderColor: 'border-green-200',
          label: 'Synced'
        };
      case 'Mismatch':
        return {
          icon: AlertTriangle,
          color: 'text-amber-600',
          bgColor: 'bg-amber-50',
          borderColor: 'border-amber-200',
          label: 'Mismatch'
        };
      case 'Missing':
        return {
          icon: XCircle,
          color: 'text-red-600',
          bgColor: 'bg-red-50',
          borderColor: 'border-red-200',
          label: 'Missing'
        };
      case 'Error':
      case 'API Unavailable':
        return {
          icon: AlertTriangle,
          color: 'text-slate-600',
          bgColor: 'bg-slate-50',
          borderColor: 'border-slate-200',
          label: 'Unavailable'
        };
      case 'Not Applicable':
        return {
          icon: Clock,
          color: 'text-slate-500',
          bgColor: 'bg-slate-50',
          borderColor: 'border-slate-200',
          label: 'N/A'
        };
      default:
        return {
          icon: Clock,
          color: 'text-slate-600',
          bgColor: 'bg-slate-50',
          borderColor: 'border-slate-200',
          label: 'Unknown'
        };
    }
  };

  const config = getStatusConfig();
  const Icon = config.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Card className={cn("border-2 shadow-lg hover:shadow-xl transition-all", config.bgColor, config.borderColor)}>
        <CardHeader>
          <div className="flex justify-between items-start">
            <div className="flex items-center gap-3">
              <span className="text-4xl">{directory.logo}</span>
              <div>
                <CardTitle className="text-lg font-bold text-slate-900">{directory.name}</CardTitle>
                {directory.details?.last_sync && (
                  <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {directory.details.last_sync}
                  </p>
                )}
              </div>
            </div>
            <div className="flex flex-col items-end gap-2">
              <Icon className={cn("w-6 h-6", config.color)} />
              <Badge variant="outline" className="text-xs font-semibold">
                Rank #{directory.rank}
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <Badge className={cn("font-semibold", config.color, config.bgColor, "border", config.borderColor)}>
              {config.label}
            </Badge>

            {directory.details?.rating && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-600">Rating:</span>
                <span className="font-semibold text-slate-900 flex items-center gap-1">{directory.details.rating} <Star className="w-4 h-4" /></span>
              </div>
            )}

            {directory.details?.reviews && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-600">Reviews:</span>
                <span className="font-semibold text-slate-900">{directory.details.reviews}</span>
              </div>
            )}

            {directory.details?.followers && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-600">Followers:</span>
                <span className="font-semibold text-slate-900">{directory.details.followers}</span>
              </div>
            )}

            {directory.issue && (
              <div className="mt-3 p-3 bg-white/60 rounded-lg border border-amber-200">
                <div className="flex items-start gap-2 text-sm">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <span className="text-slate-700">{directory.issue}</span>
                </div>
              </div>
            )}

            {directory.details?.note && (
              <div className="mt-3 p-3 bg-white/60 rounded-lg border border-slate-200">
                <p className="text-xs text-slate-600">{directory.details.note}</p>
              </div>
            )}

            <div className="mt-3 pt-3 border-t border-slate-200">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-500">Score:</span>
                <span className="text-lg font-bold text-slate-900">{directory.score}/100</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};

// Insight Card
const InsightCard = ({ insight, index }) => {
  const configs = {
    success: {
      icon: CheckCircle2,
      bg: "from-green-50 to-emerald-50",
      border: "border-green-200",
      iconBg: "bg-green-500"
    },
    warning: {
      icon: AlertTriangle,
      bg: "from-amber-50 to-orange-50",
      border: "border-amber-200",
      iconBg: "bg-amber-500"
    },
    urgent: {
      icon: XCircle,
      bg: "from-red-50 to-pink-50",
      border: "border-red-200",
      iconBg: "bg-red-500"
    },
    info: {
      icon: Globe,
      bg: "from-blue-50 to-indigo-50",
      border: "border-blue-200",
      iconBg: "bg-blue-500"
    }
  };

  const config = configs[insight.type] || configs.info;
  const Icon = config.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.1 }}
      className={cn(
        "bg-gradient-to-br rounded-xl p-5 border-2 shadow-md hover:shadow-lg transition-all",
        config.bg,
        config.border
      )}
    >
      <div className="flex items-start gap-3">
        <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0", config.iconBg)}>
          <Icon className="w-5 h-5 text-white" />
        </div>
        <div className="flex-1">
          <h5 className="font-bold text-sm text-slate-900 mb-1">{insight.headline}</h5>
          <p className="text-xs text-slate-700 leading-relaxed">{insight.description}</p>
        </div>
      </div>
    </motion.div>
  );
};

// Recommendation Card
const RecommendationCard = ({ recommendation, index }) => {
  const impactColors = {
    high: "bg-red-100 text-red-700 border-red-200",
    medium: "bg-amber-100 text-amber-700 border-amber-200",
    low: "bg-green-100 text-green-700 border-green-200"
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3, delay: index * 0.1 }}
      className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm hover:shadow-md transition-all"
    >
      <div className="flex items-start justify-between mb-2">
        <Badge className={cn("text-xs font-semibold border", impactColors[recommendation.impact])}>
          {recommendation.impact} impact
        </Badge>
        <Badge variant="outline" className="text-xs">
          {recommendation.effort} effort
        </Badge>
      </div>
      <p className="text-sm text-slate-800 font-medium">{recommendation.task}</p>
    </motion.div>
  );
};

// Scan Form Dialog
const ScanFormDialog = ({ onScan, isScanning, googleMapsStatus }) => {
  const [formData, setFormData] = useState({
    business_name: '',
    street_address: '',
    city: '',
    state: '',
    zip_code: '',
    country: 'USA',
    phone: '',
    website: '',
    industry: '',
    place_id: ''
  });

  const [autoFilledFields, setAutoFilledFields] = useState([]);
  const [manualEditMode, setManualEditMode] = useState(false);
  const businessNameInputRef = useRef(null);

  const handlePlaceSelected = (placeData) => {
    console.log("📍 Place selected, updating form:", placeData);
    setFormData(placeData);
    
    const filled = [];
    if (placeData.street_address) filled.push('street_address');
    if (placeData.city) filled.push('city');
    if (placeData.state) filled.push('state');
    if (placeData.zip_code) filled.push('zip_code');
    if (placeData.website) filled.push('website');
    if (placeData.phone) filled.push('phone');
    if (placeData.industry) filled.push('industry'); // Industry can also be autofilled
    
    setAutoFilledFields(filled);
    setManualEditMode(false); // Reset manual edit mode when a new place is selected
  };

  usePlacesAutocomplete(businessNameInputRef, handlePlaceSelected);

  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Basic validation
    if (!formData.business_name || !formData.city || !formData.state) {
      alert("Business name, city, and state are required.");
      return;
    }

    // Only require place_id if Google Maps is working and user hasn't explicitly entered manual mode
    if (googleMapsStatus.isLoaded && !formData.place_id && !manualEditMode) {
      alert("Please select your business from the Google dropdown to ensure accurate scanning. If your business is not listed, you may proceed by manually entering the details.");
      setManualEditMode(true); // Allow manual submission after warning
      return;
    }
    
    console.log("🚀 Submitting scan with data:", formData);
    onScan(formData);
  };

  const handleManualEdit = (field, value) => {
    setFormData({ ...formData, [field]: value });
    // If maps is loaded and a field that was previously autofilled is manually edited, activate manualEditMode
    if (!manualEditMode && googleMapsStatus.isLoaded && autoFilledFields.includes(field)) {
      setManualEditMode(true);
    }
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 shadow-md">
          <Sparkles className="w-4 h-4 mr-2" />
          Run Directory Scan
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px] bg-white max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
            Directory Sync Scan
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          {/* API Status Display */}
          {googleMapsStatus.error ? (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-semibold text-amber-900">Google Places Autocomplete Unavailable</p>
                <p className="text-xs text-amber-700 mt-1">
                  {googleMapsStatus.error === "Google Maps API key not configured"
                    ? "Google Maps API key is missing. Please contact us."
                    : "Failed to load Google Maps. Please enter business details manually."}
                </p>
              </div>
            </div>
          ) : googleMapsStatus.isLoaded && (
            <div className="p-3 bg-green-50 border border-green-200 rounded-lg flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-semibold text-green-900 flex items-center gap-1"><Check className="w-4 h-4" /> Google Maps Autocomplete Connected</p>
                <p className="text-xs text-green-700 mt-1">
                  Start typing to search for your business.
                </p>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="business_name">Business Name *</Label>
              <Input
                ref={businessNameInputRef}
                id="business_name"
                value={formData.business_name}
                onChange={(e) => setFormData({ ...formData, business_name: e.target.value })}
                placeholder={googleMapsStatus.isLoaded ? "Start typing your business name..." : "Enter business name"}
                required
                // Removed disabled as manual entry is now always possible, even if Google Maps isn't loaded
              />
              <p className="text-xs text-slate-500 flex items-center gap-1">
                {googleMapsStatus.isLoaded ? (
                  <>
                    <Info className="w-3 h-3" />
                    Start typing — suggestions powered by Google
                  </>
                ) : googleMapsStatus.error ? (
                  <>
                    <AlertTriangle className="w-3 h-3 text-amber-500" />
                    Manual entry required (Google Maps unavailable)
                  </>
                ) : (
                  <>
                    <Loader2 className="w-3 h-3 animate-spin" />
                    Loading Google Places...
                  </>
                )}
              </p>
            </div>

            {/* Display verification only if Google Maps loaded and place_id exists, and not in manual edit mode */}
            {formData.place_id && googleMapsStatus.isLoaded && !manualEditMode && (
              <div className="md:col-span-2 p-3 bg-green-50 border border-green-200 rounded-lg flex items-start gap-2">
                <Check className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-green-900">Business Verified & Auto-filled</p>
                  <p className="text-xs text-green-700">Information successfully retrieved from Google Places.</p>
                </div>
              </div>
            )}

            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="street_address">Street Address</Label>
              <Input
                id="street_address"
                value={formData.street_address}
                onChange={(e) => handleManualEdit('street_address', e.target.value)}
                placeholder="123 Main Street"
              />
              {autoFilledFields.includes('street_address') && !manualEditMode && (
                <p className="text-xs text-green-600 flex items-center gap-1">
                  <Check className="w-3 h-3" />
                  Auto-filled
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="city">City *</Label>
              <Input
                id="city"
                value={formData.city}
                onChange={(e) => handleManualEdit('city', e.target.value)}
                placeholder="Chicago"
                required
              />
              {autoFilledFields.includes('city') && !manualEditMode && (
                <p className="text-xs text-green-600 flex items-center gap-1">
                  <Check className="w-3 h-3" />
                  Auto-filled
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="state">State *</Label>
              <Input
                id="state"
                value={formData.state}
                onChange={(e) => handleManualEdit('state', e.target.value)}
                placeholder="IL"
                required
                maxLength={2}
              />
              {autoFilledFields.includes('state') && !manualEditMode && (
                <p className="text-xs text-green-600 flex items-center gap-1">
                  <Check className="w-3 h-3" />
                  Auto-filled
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="zip_code">ZIP Code</Label>
              <Input
                id="zip_code"
                value={formData.zip_code}
                onChange={(e) => handleManualEdit('zip_code', e.target.value)}
                placeholder="60601"
              />
              {autoFilledFields.includes('zip_code') && !manualEditMode && (
                <p className="text-xs text-green-600 flex items-center gap-1">
                  <Check className="w-3 h-3" />
                  Auto-filled
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={(e) => handleManualEdit('phone', e.target.value)}
                placeholder="+1 (555) 123-4567"
              />
              {autoFilledFields.includes('phone') && !manualEditMode && (
                <p className="text-xs text-green-600 flex items-center gap-1">
                  <Check className="w-3 h-3" />
                  Auto-filled
                </p>
              )}
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="website">Website</Label>
              <Input
                id="website"
                value={formData.website}
                onChange={(e) => handleManualEdit('website', e.target.value)}
                placeholder="https://joespizza.com"
              />
              {autoFilledFields.includes('website') && !manualEditMode && (
                <p className="text-xs text-green-600 flex items-center gap-1">
                  <Check className="w-3 h-3" />
                  Auto-filled
                </p>
              )}
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="industry">Industry</Label>
              <Input
                id="industry"
                value={formData.industry}
                onChange={(e) => setFormData({ ...formData, industry: e.target.value })} // Keep this as setFormData because industry is often not from Google or is a general category
                placeholder="Restaurant"
              />
               {autoFilledFields.includes('industry') && !manualEditMode && (
                <p className="text-xs text-green-600 flex items-center gap-1">
                  <Check className="w-3 h-3" />
                  Auto-filled
                </p>
              )}
            </div>
          </div>

          {manualEditMode && googleMapsStatus.isLoaded && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-amber-800">
                Manual editing enabled. For best results, select from Google dropdown.
              </p>
            </div>
          )}

          <Button 
            type="submit" 
            disabled={isScanning} // Removed googleMapsLoaded condition, as manual entry is now always possible
            className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700"
          >
            {isScanning ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Scanning Directories...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 mr-2" />
                Start Scan
              </>
            )}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default function DirectorySyncHub({ user }) {
  const [scanResult, setScanResult] = useState(null);
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState(null);
  const googleMapsStatus = useGoogleMapsScript();

  const handleScan = async (formData) => {
    setIsScanning(true);
    setError(null);
    setScanResult(null);

    try {
      console.log("🚀 Frontend: Starting directory scan with data:", formData);
      
      const response = await fetch("/functions/runDirectorySyncScan", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Accept": "application/json"
        },
        body: JSON.stringify(formData)
      });

      console.log("📡 Frontend: Scan response status:", response.status);

      // Get response as text first
      const responseText = await response.text();
      console.log("📄 Frontend: Response preview:", responseText.slice(0, 200));

      // Check if response is HTML (error page)
      if (responseText.trim().startsWith('<!DOCTYPE') || responseText.trim().startsWith('<html')) {
        console.error("❌ Frontend: Received HTML instead of JSON");
        throw new Error("Server returned an error page. Please check API configuration or server logs.");
      }

      // Try to parse JSON
      let data;
      try {
        data = JSON.parse(responseText);
        console.log("📦 Frontend: Parsed response data:", data);
      } catch (parseError) {
        console.error("❌ Frontend: JSON parse error:", parseError.message);
        console.error("📄 Frontend: Raw response:", responseText);
        throw new Error("Invalid JSON response from server. Raw response: " + responseText.slice(0, 200));
      }

      if (!response.ok || !data.success) {
        throw new Error(data.error || "Scan failed");
      }

      console.log("✅ Frontend: Scan completed successfully");
      setScanResult(data);

    } catch (err) {
      console.error("❌ Frontend: Scan error:", err);
      setError(err.message || "An error occurred during scanning");
    } finally {
      setIsScanning(false);
    }
  };

  const handleExportReport = () => {
    if (!scanResult) return;
    
    const dataStr = JSON.stringify(scanResult, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `directory-report-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
          <Globe className="w-8 h-8 text-indigo-600" />
          Directory Sync Hub
        </h1>
        <p className="text-slate-600 mt-1">Monitor NAP consistency across major directories</p>
      </div>

      {/* Action Bar */}
      <Card className="bg-gradient-to-r from-indigo-50 to-purple-50 border-indigo-200/60 shadow-lg">
        <CardContent className="p-6">
          <div className="flex flex-wrap gap-3 items-center justify-between">
            <div>
              <h3 className="text-lg font-bold text-slate-900 mb-1">Quick Actions</h3>
              <p className="text-sm text-slate-600">Scan your business across all major directories</p>
            </div>
            <div className="flex gap-3">
              <ScanFormDialog onScan={handleScan} isScanning={isScanning} googleMapsStatus={googleMapsStatus} />
              {scanResult && (
                <Button
                  variant="outline"
                  onClick={handleExportReport}
                  className="border-indigo-300 hover:bg-indigo-50"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Export Report
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Error Display */}
      {error && (
        <Card className="bg-red-50 border-2 border-red-200">
          <CardContent className="p-6">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-6 h-6 text-red-600 flex-shrink-0" />
              <div>
                <h4 className="font-bold text-red-900 mb-1">Scan Error</h4>
                <p className="text-sm text-red-700">{error}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Results */}
      {scanResult && (
        <>
          {/* Overview Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <Card className="bg-white/80 backdrop-blur-sm border-slate-200/60 shadow-lg">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-slate-600">Visibility Score</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-4xl font-bold text-indigo-600">{scanResult.directory_score}</div>
                <p className="text-sm text-slate-500 mt-1">out of 100</p>
              </CardContent>
            </Card>

            <Card className="bg-white/80 backdrop-blur-sm border-slate-200/60 shadow-lg">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-slate-600">Total Directories</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-4xl font-bold text-slate-900">{scanResult.summary.total_directories}</div>
                <p className="text-sm text-slate-500 mt-1">Being monitored</p>
              </CardContent>
            </Card>

            <Card className="bg-green-50 border-2 border-green-200 shadow-lg">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-green-700">Synced</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-4xl font-bold text-green-600">{scanResult.summary.synced}</div>
                <p className="text-sm text-green-600 mt-1">Perfect match</p>
              </CardContent>
            </Card>

            <Card className="bg-red-50 border-2 border-red-200 shadow-lg">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-red-700">Issues Found</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-4xl font-bold text-red-600">{scanResult.summary.issues}</div>
                <p className="text-sm text-red-600 mt-1">Need attention</p>
              </CardContent>
            </Card>
          </div>

          {/* Directory Status Grid */}
          <div>
            <h2 className="text-2xl font-bold text-slate-900 mb-4">Directory Status</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {scanResult.directories.map((directory, idx) => (
                <DirectoryStatusCard key={idx} directory={directory} />
              ))}
            </div>
          </div>

          {/* Insights */}
          {scanResult.insights && scanResult.insights.length > 0 && (
            <div>
              <h2 className="text-2xl font-bold text-slate-900 mb-4">Key Insights</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {scanResult.insights.map((insight, idx) => (
                  <InsightCard key={idx} insight={insight} index={idx} />
                ))}
              </div>
            </div>
          )}

          {/* Recommendations */}
          {scanResult.recommendations && scanResult.recommendations.length > 0 && (
            <div>
              <h2 className="text-2xl font-bold text-slate-900 mb-4">Recommended Actions</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {scanResult.recommendations.map((rec, idx) => (
                  <RecommendationCard key={idx} recommendation={rec} index={idx} />
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* Empty State */}
      {!scanResult && !isScanning && !error && (
        <Card className="bg-white/80 backdrop-blur-sm border-slate-200/60 shadow-lg">
          <CardContent className="py-16">
            <div className="text-center">
              <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-indigo-100 to-purple-100 rounded-full flex items-center justify-center">
                <Globe className="w-10 h-10 text-indigo-600" />
              </div>
              <h3 className="text-2xl font-bold text-slate-900 mb-2">Ready to Scan</h3>
              <p className="text-slate-500 mb-6 max-w-md mx-auto">
                Check your business presence and accuracy across major directories in seconds
              </p>
              <ScanFormDialog onScan={handleScan} isScanning={isScanning} googleMapsStatus={googleMapsStatus} />
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
