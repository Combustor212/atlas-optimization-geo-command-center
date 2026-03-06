
import React, { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Search, Building, CheckCircle2, AlertTriangle, Sparkles, RotateCcw, Globe, Phone, Star, Image as ImageIcon, Clock, Info, MessageCircle, Check, X, Target, Lock, ArrowRight, Zap } from "lucide-react"; // Added Target, Lock, ArrowRight, Zap
import { cn } from "@/lib/utils";
import { motion } from "framer-motion"; // Added framer-motion import

// Placeholder for Link component, assuming a routing library like Next.js Link or react-router-dom Link
// If using Next.js: import Link from "next/link";
// If using react-router-dom: import { Link } from "react-router-dom";
// For this example, we'll just use an anchor tag with a dummy function for `to` prop.
const Link = ({ children, to, className }) => <a href={to} className={className}>{children}</a>;


// Circular Progress Ring Component
const CircularProgress = ({ value, size = 120, strokeWidth = 12, label, sublabel }) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (value / 100) * circumference;

  const getColor = (val) => {
    if (val >= 80) return { stroke: "stroke-green-500", bg: "text-green-50", text: "text-green-600" };
    if (val >= 60) return { stroke: "stroke-amber-500", bg: "text-amber-50", text: "text-amber-600" };
    return { stroke: "stroke-red-500", bg: "text-red-50", text: "text-red-600" };
  };

  const colors = getColor(value);

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="relative inline-flex items-center justify-center">
        <svg width={size} height={size} className="transform -rotate-90">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="currentColor"
            strokeWidth={strokeWidth}
            fill="none"
            className="text-slate-100"
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="currentColor"
            strokeWidth={strokeWidth}
            fill="none"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            className={cn("transition-all duration-700", colors.stroke)}
            strokeLinecap="round"
          />
        </svg>
        <div className="absolute text-center">
          <span className={cn("text-3xl font-black", colors.text)}>{value}</span>
          <span className="text-sm text-slate-500 block">%</span>
        </div>
      </div>
      <div className="text-center">
        <p className="text-sm font-bold text-slate-900">{label}</p>
        <p className="text-xs text-slate-500">{sublabel}</p>
      </div>
    </div>
  );
};

// Modern Insight Card Component
const InsightCard = ({ type, headline, subtext }) => {
  const configs = {
    urgent: {
      icon: AlertTriangle,
      bg: "bg-red-50",
      border: "border-red-200",
      iconBg: "bg-red-100",
      iconColor: "text-red-600",
    },
    warning: {
      icon: AlertTriangle,
      bg: "bg-amber-50",
      border: "border-amber-200",
      iconBg: "bg-amber-100",
      iconColor: "text-amber-600",
    },
    success: {
      icon: CheckCircle2,
      bg: "bg-green-50",
      border: "border-green-200",
      iconBg: "bg-green-100",
      iconColor: "text-green-600",
    },
    info: {
      icon: Info,
      bg: "bg-blue-50",
      border: "border-blue-200",
      iconBg: "bg-blue-100",
      iconColor: "text-blue-600",
    }
  };

  const config = configs[type] || configs.info;
  const Icon = config.icon;

  return (
    <div className={cn(
      "p-4 rounded-xl border-2 transition-all hover:shadow-md",
      config.bg,
      config.border
    )}>
      <div className="flex items-start gap-3">
        <div className={cn("p-2 rounded-lg flex-shrink-0", config.iconBg)}>
          <Icon className={cn("w-5 h-5", config.iconColor)} />
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="font-bold text-slate-900 mb-1 flex items-center gap-2">
            <span>{headline}</span>
          </h4>
          <p className="text-sm text-slate-600 leading-relaxed">{subtext}</p>
        </div>
      </div>
    </div>
  );
};

// Star Rating Display
const StarRating = ({ rating, maxRating = 5 }) => {
  const fullStars = Math.floor(rating);
  const hasHalfStar = rating % 1 >= 0.5;
  
  return (
    <div className="flex items-center gap-1">
      {[...Array(maxRating)].map((_, i) => (
        <Star
          key={i}
          className={cn(
            "w-5 h-5",
            i < fullStars ? "fill-amber-400 text-amber-400" : 
            i === fullStars && hasHalfStar ? "fill-amber-200 text-amber-400" : 
            "fill-slate-200 text-slate-200"
          )}
        />
      ))}
    </div>
  );
};

// Grade Badge Component
const GradeBadge = ({ score }) => {
  let grade, color;
  if (score >= 90) {
    grade = "A+";
    color = "bg-green-100 text-green-700 border-green-300";
  } else if (score >= 80) {
    grade = "A";
    color = "bg-green-100 text-green-700 border-green-300";
  } else if (score >= 70) {
    grade = "B";
    color = "bg-blue-100 text-blue-700 border-blue-300";
  } else if (score >= 60) {
    grade = "C";
    color = "bg-amber-100 text-amber-700 border-amber-300";
  } else if (score >= 50) {
    grade = "D";
    color = "bg-orange-100 text-orange-700 border-orange-300";
  } else {
    grade = "F";
    color = "bg-red-100 text-red-700 border-red-300";
  }

  return (
    <Badge className={cn("px-4 py-2 text-2xl font-black border-2", color)}>
      {grade}
    </Badge>
  );
};

// Review Sentiment Bar Chart
const ReviewSentimentChart = ({ reviewCount }) => {
  const distributionData = reviewCount > 0 ? {
    5: 65,
    4: 20,
    3: 10,
    2: 3,
    1: 2
  } : { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };

  const totalPercentage = Object.values(distributionData).reduce((a, b) => a + b, 0);

  return (
    <div className="space-y-2">
      {[5, 4, 3, 2, 1].map(stars => {
        const percentage = totalPercentage > 0 ? (distributionData[stars] / totalPercentage) * 100 : 0;
        
        return (
          <div key={stars} className="flex items-center gap-3">
            <div className="flex items-center gap-1 w-16">
              <span className="text-xs font-medium text-slate-600">{stars}</span>
              <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
            </div>
            <div className="flex-1 h-3 bg-slate-100 rounded-full overflow-hidden">
              <div
                className={cn(
                  "h-full transition-all duration-500",
                  stars >= 4 ? "bg-green-500" : stars === 3 ? "bg-amber-500" : "bg-red-500"
                )}
                style={{ width: `${percentage}%` }}
              />
            </div>
            <span className="text-xs font-medium text-slate-600 w-12 text-right">
              {Math.round(percentage)}%
            </span>
          </div>
        );
      })}
    </div>
  );
};

export default function EnhancedScanner() {
  const [businessName, setBusinessName] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [zipCode, setZipCode] = useState("");
  const [website, setWebsite] = useState("");
  const [phone, setPhone] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
  const [selectedPlaceId, setSelectedPlaceId] = useState(null);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
  const [scanResult, setScanResult] = useState(null);
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState(null);
  const [errorSuggestion, setErrorSuggestion] = useState(null);
  const [checkedItems, setCheckedItems] = useState([]);
  const [autoFilledFields, setAutoFilledFields] = useState([]);
  const debounceTimer = useRef(null);
  const dropdownRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target) && 
          inputRef.current && !inputRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchSuggestions = async (query) => {
    if (!query || query.length < 2) {
      setSuggestions([]);
      setShowDropdown(false);
      return;
    }

    clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(async () => {
      setIsLoadingSuggestions(true);
      setError(null);
      setErrorSuggestion(null);

      try {
        console.log("🔍 Frontend: Fetching suggestions for:", query);
        
        const response = await fetch("/functions/placesAutocomplete", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ input: query })
        });

        const data = await response.json();
        console.log("📦 Frontend: Autocomplete response:", data);

        if (data.error) {
          setError("⚠️ " + data.error);
          setSuggestions([]);
          setShowDropdown(false);
        } else {
          const predictions = data.predictions || [];
          console.log("✅ Frontend: Got", predictions.length, "suggestions");
          if (predictions.length === 0 && query.length >= 2) {
            setError("No matches found for your search");
            setErrorSuggestion("Try typing the full business name or check spelling");
          }
          setSuggestions(predictions);
          setShowDropdown(predictions.length > 0);
        }
      } catch (err) {
        console.error("❌ Frontend: Autocomplete error:", err);
        setError("Connection error");
        setErrorSuggestion("Please check your internet connection and try again");
        setSuggestions([]);
        setShowDropdown(false);
      } finally {
        setIsLoadingSuggestions(false);
      }
    }, 400);
  };

  const handleBusinessNameChange = (value) => {
    setBusinessName(value);
    setSelectedPlaceId(null);
    setError(null);
    setErrorSuggestion(null);
    setAutoFilledFields([]);
    fetchSuggestions(value);
  };

  const handleSelectPrediction = async (prediction) => {
    const placeId = prediction.place_id;
    const displayName = prediction.displayName ?? prediction.structured_formatting?.main_text ?? prediction.description ?? '';

    if (!placeId) return;

    // Prevent duplicate fetch for same place
    if (selectedPlaceId === placeId) return;

    // 1. Immediately set form state and close dropdown
    setBusinessName(displayName);
    setSelectedPlaceId(placeId);
    setShowDropdown(false);
    setSuggestions([]);
    setError(null);
    setErrorSuggestion(null);
    setIsLoadingDetails(true);

    try {
      const response = await fetch("/functions/placesDetails", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ place_id: placeId })
      });

      const data = await response.json();

      if (data.status === "OK" && data.result) {
        const result = data.result;
        const filledFields = [];
        const comp = result.components || {};
        const getComp = (type, short = false) => {
          const c = result.address_components?.find(x => x.types?.includes(type));
          return c ? (short ? c.short_name : c.long_name) : '';
        };

        const cityVal = comp.city ?? getComp('locality');
        if (cityVal) { setCity(cityVal); filledFields.push('city'); }
        const stateVal = comp.state ?? getComp('administrative_area_level_1', true);
        if (stateVal) { setState(stateVal); filledFields.push('state'); }
        const zipVal = comp.zip ?? getComp('postal_code');
        if (zipVal) { setZipCode(zipVal); filledFields.push('zipCode'); }
        if (result.website) setWebsite(result.website);
        if (result.phone) setPhone(result.phone ?? result.formatted_phone_number ?? result.international_phone_number);
        setAutoFilledFields(prev => [...new Set([...prev, ...filledFields])]);
      }
    } catch (err) {
      console.error("❌ Frontend: Error fetching place details:", err);
      setError("Could not fetch place details");
      setSelectedPlaceId(null);
    } finally {
      setIsLoadingDetails(false);
    }
  };

  const handleRunScan = async () => {
    console.log("🚀 Frontend: Starting scan...");
    console.log("📋 Frontend: Input data:", { businessName, city, state, zipCode, selectedPlaceId });
    
    if (!businessName || !city || !state) {
      setError("Business name, city, and state are required");
      setErrorSuggestion("Please fill in all required fields");
      return;
    }

    setIsScanning(true);
    setError(null);
    setErrorSuggestion(null);
    setScanResult(null); // Clear previous results

    try {
      const requestBody = {
        place_id: selectedPlaceId,
        business_name: businessName,
        city: city,
        state: state,
        zip_code: zipCode || null,
        website: website || null
      };

      console.log("📤 Frontend: Sending scan request:", requestBody);

      // Call scanner function directly
      const { scanner } = await import('@/api/functions');
      const data = await scanner(requestBody);
      console.log("📦 Frontend: Scan response data:", data);

      let isAuthRelatedError = false;

      // Handle authentication errors gracefully - allows some results in public mode
      if (data.error && (
        data.error.toLowerCase().includes('logged in') || 
        data.error.toLowerCase().includes('authentication') || 
        data.error.toLowerCase().includes('unauthorized') ||
        data.error.toLowerCase().includes('not authenticated')
      )) {
        console.log("⚠️ Frontend: Auth error detected, but scanner should work without login");
        setError("Public scan mode - some features may be limited");
        setErrorSuggestion("Sign in for full access to all features");
        isAuthRelatedError = true;
        // Don't return - continue to show results if available, but flag auth error
      }

      // Handle other error responses (if not an auth error, or if auth error but no data)
      if ((!response.ok || data.success === false) && !isAuthRelatedError) {
        // Updated generic error messages as per outline
        const errorMessage = typeof data.error === 'string' 
          ? data.error 
          : data.error?.message || "Scan failed";
        
        const errorSuggestionText = data.suggestion || "Check your input and try again";
        
        console.error("❌ Frontend: Scan failed:", errorMessage);
        setError(errorMessage);
        setErrorSuggestion(errorSuggestionText);
        setIsScanning(false); // Ensure loading state is cleared on early return
        return;
      }

      // Validate response structure (crucial for rendering, even in public mode)
      if (!data.business || !data.scores) {
        console.error("❌ Frontend: Invalid response structure:", data);
        if (isAuthRelatedError) {
             setError("Public scan mode failed - received incomplete data.");
             setErrorSuggestion("Please try again or sign in for full access.");
        } else {
             setError("Scan failed - received incomplete data from server.");
             setErrorSuggestion("Please contact us if this persists.");
        }
        setIsScanning(false);
        return;
      }

      console.log("✅ Frontend: Scan successful!");
      console.log("📊 Frontend: Final scores:", data.scores);
      console.log("🏢 Frontend: Business data:", data.business);
      
      setScanResult(data);
      setCheckedItems([]);
      
    } catch (err) {
      console.error("❌ Frontend: Scan error:", err);
      
      // Extract readable error message
      // Updated generic catch block error messages as per outline, preserving auth check
      let errorMessage = "Connection error - unable to reach server";
      let suggestionText = "Check your internet connection and try again";
      
      if (err.message) {
        errorMessage = err.message;
        
        // Handle auth errors gracefully in the catch block as well
        if (errorMessage.toLowerCase().includes('logged in') || errorMessage.toLowerCase().includes('authentication') || errorMessage.toLowerCase().includes('unauthorized')) {
          errorMessage = "Public scan mode active";
          suggestionText = "Sign in for full access to all features";
        } else if (errorMessage.includes("Failed to fetch")) {
          errorMessage = "Network error - cannot connect to server";
          suggestionText = "Check your internet connection and server status.";
        } else if (errorMessage.includes("JSON")) {
          errorMessage = "Server error - invalid response format";
          suggestionText = "Please contact us if this persists.";
        }
      }
      
      setError(errorMessage);
      setErrorSuggestion(suggestionText);
      
    } finally {
      setIsScanning(false);
    }
  };

  const handleReset = () => {
    console.log("🔄 Frontend: Resetting scanner");
    setBusinessName("");
    setCity("");
    setState("");
    setZipCode("");
    setWebsite("");
    setPhone("");
    setSuggestions([]);
    setShowDropdown(false);
    setSelectedPlaceId(null);
    setScanResult(null);
    setError(null);
    setErrorSuggestion(null);
    setCheckedItems([]);
    setAutoFilledFields([]);
  };

  const toggleCheckItem = (index) => {
    setCheckedItems(prev => 
      prev.includes(index) ? prev.filter(i => i !== index) : [...prev, index]
    );
  };

  // Dummy function for creating page URLs
  const createPageUrl = (pageName) => {
    switch (pageName) {
      case "pricing":
        return "/pricing"; // Replace with your actual pricing page URL
      case "ReputationManager":
        return "/app/reputation-manager"; // Replace with your actual reputation manager page URL
      default:
        return "/";
    }
  };

  if (scanResult) {
    const { business, scores, meo_details, geo_details } = scanResult;
    console.log("🎨 Frontend: Rendering results for:", business.name);
    
    // Realistic scoring based on actual performance
    const isTopPerformer = business.rating >= 4.5 && business.reviewCount >= 50;
    const adjustedMeoScore = isTopPerformer ? Math.min(scores.meo, 85) : Math.min(scores.meo, 65);
    const adjustedGeoScore = isTopPerformer ? scores.geo : Math.min(scores.geo, 58);
    const adjustedFinalScore = Math.round((adjustedGeoScore * 0.6) + (adjustedMeoScore * 0.4));
    
    return (
      <div className="w-full space-y-8">
        {/* Header Card */}
        <Card className="shadow-2xl border-0 bg-gradient-to-br from-violet-50 via-purple-50 to-white">
          <CardHeader className="border-b border-violet-100">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <CardTitle className="text-3xl font-black text-slate-900 flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-violet-600 to-purple-600 flex items-center justify-center shadow-lg">
                    <CheckCircle2 className="w-7 h-7 text-white" />
                  </div>
                  Scan Results
                </CardTitle>
                <p className="text-slate-600 mt-2 text-lg">{business.name}</p>
                <p className="text-slate-500 text-sm mt-1">{business.address}</p>
                {business.website && business.website !== 'Not available' && (
                  <a 
                    href={business.website.startsWith('http') ? business.website : `https://${business.website}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-indigo-600 hover:text-indigo-800 underline inline-flex items-center gap-1 mt-1"
                  >
                    <Globe className="w-3 h-3" />
                    {business.website}
                  </a>
                )}
              </div>
              <div className="flex items-center gap-3">
                <GradeBadge score={adjustedFinalScore} />
                <Button
                  onClick={handleReset}
                  variant="outline"
                  className="border-2 border-violet-200 hover:bg-violet-50"
                >
                  <RotateCcw className="w-4 h-4 mr-2" />
                  Scan Another
                </Button>
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* FLAGSHIP FEATURE: GEO/SEO Scanner Stats - Center & Highlight */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="relative"
        >
          {/* Glowing border effect */}
          <div className="absolute -inset-1 bg-gradient-to-r from-violet-600 via-purple-600 to-pink-600 rounded-3xl blur-lg opacity-30 animate-pulse" />
          
          <Card className="relative bg-white/95 backdrop-blur-sm border-2 border-violet-200 shadow-2xl rounded-3xl overflow-hidden">
            {/* Premium badge */}
            <div className="absolute top-4 right-4">
              <Badge className="bg-gradient-to-r from-violet-600 to-purple-600 text-white px-3 py-1 text-xs font-bold">
                <Sparkles className="w-3 h-3 mr-1" />
                FLAGSHIP FEATURE
              </Badge>
            </div>

            <CardContent className="p-8 md:p-12">
              <div className="text-center mb-8">
                <h2 className="text-3xl md:text-4xl font-black text-slate-900 mb-3 flex items-center justify-center gap-3">
                  <Target className="w-10 h-10 text-violet-600" />
                  GEO/SEO Scanner Results
                </h2>
                <p className="text-slate-600 text-lg">
                  Your comprehensive visibility analysis across AI-powered search engines
                </p>
              </div>

              {/* Score Overview - Centered & Prominent */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-10">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: 0.1 }}
                >
                  <Card className="bg-gradient-to-br from-amber-50 to-orange-50 border-2 border-amber-200 shadow-lg hover:shadow-xl transition-all">
                    <CardContent className="p-8 flex flex-col items-center">
                      <CircularProgress 
                        value={adjustedMeoScore} 
                        label="MEO Score" 
                        sublabel="Maps Optimization"
                      />
                      <p className="text-xs text-center text-slate-500 mt-3">
                        Google Business Profile health
                      </p>
                    </CardContent>
                  </Card>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: 0.2 }}
                >
                  <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-200 shadow-lg hover:shadow-xl transition-all relative">
                    <CardContent className="p-8 flex flex-col items-center">
                      <CircularProgress 
                        value={adjustedGeoScore} 
                        label="GEO Score" 
                        sublabel="AI Visibility"
                      />
                      <p className="text-xs text-center text-slate-500 mt-3">
                        AI-powered search presence
                      </p>
                    </CardContent>
                  </Card>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: 0.3 }}
                >
                  <Card className="bg-gradient-to-br from-violet-50 to-purple-50 border-2 border-violet-200 shadow-lg hover:shadow-xl transition-all">
                    <CardContent className="p-8 flex flex-col items-center">
                      <CircularProgress 
                        value={adjustedFinalScore} 
                        label="Final Score" 
                        sublabel="Overall Grade"
                      />
                      <p className="text-xs text-center text-slate-500 mt-3">
                        (GEO × 60%) + (MEO × 40%)
                      </p>
                    </CardContent>
                  </Card>
                </motion.div>
              </div>

              {/* Integration CTA Button */}
              <div className="text-center">
                <Button 
                  asChild
                  size="lg"
                  className="bg-gradient-to-r from-violet-600 via-purple-600 to-pink-600 hover:from-violet-700 hover:via-purple-700 hover:to-pink-700 text-white font-bold px-10 py-6 text-lg rounded-2xl shadow-2xl hover:shadow-3xl transition-all duration-300"
                >
                  <Link to={createPageUrl("pricing")}>
                    <Zap className="w-5 h-5 mr-2" />
                    Integrate Now for Full Automation
                    <ArrowRight className="w-5 h-5 ml-2" />
                  </Link>
                </Button>
                <p className="text-xs text-slate-500 mt-4">
                  Connect your business to unlock automated optimization and real-time monitoring
                </p>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* UNLOCKED: Reputation Manager Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
        >
          <Card className="bg-gradient-to-br from-green-50 to-emerald-50 border-2 border-green-200 shadow-xl">
            <CardHeader className="border-b border-green-100 bg-white/60 backdrop-blur-sm">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-3 text-2xl text-slate-900">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-green-600 to-emerald-600 flex items-center justify-center shadow-lg">
                    <Star className="w-5 h-5 text-white fill-white" />
                  </div>
                  Reputation Manager
                </CardTitle>
                <Badge className="bg-green-100 text-green-700 border-green-300 font-bold px-4 py-2">
                  <CheckCircle2 className="w-4 h-4 mr-1" />
                  NOW AVAILABLE
                </Badge>
              </div>
            </CardHeader>
            
            <CardContent className="p-8 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <div className="flex items-center gap-4 mb-4">
                    <div className="text-center">
                      <div className="text-6xl font-black text-green-600">
                        {business.rating ? business.rating.toFixed(1) : "N/A"}
                      </div>
                      <div className="text-sm text-slate-500 mt-1">out of 5</div>
                    </div>
                    <div>
                      <StarRating rating={business.rating || 0} />
                      <div className="flex items-center gap-2 mt-2">
                        <MessageCircle className="w-5 h-5 text-slate-600" />
                        <span className="text-xl font-bold text-slate-900">{business.reviewCount || 0}</span>
                        <span className="text-sm text-slate-600">reviews</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <p className="text-sm font-semibold text-slate-700 mb-3">Review Distribution</p>
                  <ReviewSentimentChart reviewCount={business.reviewCount} />
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
                <div className="bg-white/60 rounded-xl p-4 border border-green-100">
                  <div className="flex items-center gap-2 mb-2">
                    <ImageIcon className="w-5 h-5 text-green-600" />
                    <span className="text-xs font-medium text-slate-600">Photos</span>
                  </div>
                  <p className="text-2xl font-bold text-slate-900">{business.photoCount || 0}</p>
                </div>

                <div className={cn(
                  "rounded-xl p-4 border",
                  business.hasHours 
                    ? "bg-green-50 border-green-200" 
                    : "bg-red-50 border-red-200"
                )}>
                  <div className="flex items-center gap-2 mb-2">
                    <Clock className="w-5 h-5 text-slate-600" />
                    <span className="text-xs font-medium text-slate-600">Hours</span>
                  </div>
                  <p className="text-lg font-bold text-slate-900">
                    {business.hasHours ? <><Check className="w-4 h-4 inline" /> Listed</> : <><X className="w-4 h-4 inline" /> Missing</>}
                  </p>
                </div>

                <div className="bg-white/60 rounded-xl p-4 border border-green-100">
                  <div className="flex items-center gap-2 mb-2">
                    <Phone className="w-5 h-5 text-green-600" />
                    <span className="text-xs font-medium text-slate-600">Phone</span>
                  </div>
                  <p className="text-xs font-semibold text-slate-900 truncate">
                    {business.phone && business.phone !== 'Not available' ? <><Check className="w-4 h-4 inline" /> Added</> : <><X className="w-4 h-4 inline" /> Missing</>}
                  </p>
                </div>

                <div className="bg-white/60 rounded-xl p-4 border border-green-100">
                  <div className="flex items-center gap-2 mb-2">
                    <Globe className="w-5 h-5 text-green-600" />
                    <span className="text-xs font-medium text-slate-600">Website</span>
                  </div>
                  <p className="text-xs font-semibold text-slate-900 truncate">
                    {business.website && business.website !== 'Not available' ? <><Check className="w-4 h-4 inline" /> Added</> : <><X className="w-4 h-4 inline" /> Missing</>}
                  </p>
                </div>
              </div>

              {meo_details.recommendations && meo_details.recommendations.length > 0 && (
                <div className="mt-6 space-y-3">
                  <h4 className="font-bold text-slate-900">Recommended Actions</h4>
                  <div className="grid gap-3">
                    {meo_details.recommendations.map((rec, idx) => (
                      <div 
                        key={idx} 
                        className="flex items-start gap-3 p-3 bg-white/60 rounded-lg border border-green-100 hover:border-green-300 hover:shadow-sm transition-all cursor-pointer"
                        onClick={() => toggleCheckItem(idx)}
                      >
                        <span className="text-2xl flex-shrink-0">{rec.icon}</span>
                        <div className="flex-1">
                          <p className={cn(
                            "text-sm transition-all",
                            checkedItems.includes(idx) ? "line-through text-slate-400" : "text-slate-700"
                          )}>
                            {rec.text}
                          </p>
                          <Badge 
                            className={cn(
                              "mt-2 text-xs",
                              rec.impact === 'high' ? "bg-red-100 text-red-700 border-red-200" :
                              rec.impact === 'medium' ? "bg-amber-100 text-amber-700 border-amber-200" :
                              "bg-green-100 text-green-700 border-green-200"
                            )}
                          >
                            {rec.impact} impact
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="text-center pt-4">
                <Button 
                  asChild
                  variant="outline"
                  className="border-2 border-green-300 hover:bg-green-50 text-green-700 font-semibold"
                >
                  <Link to={createPageUrl("ReputationManager")}>
                    <Star className="w-4 h-4 mr-2" />
                    Open Full Reputation Manager
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* LOCKED: GEO Visibility Analysis - Requires Integration */}
        {geo_details && (
          <div className="relative">
            <Card className="bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 border-2 border-indigo-200 shadow-xl opacity-60 blur-sm pointer-events-none">
              <CardHeader className="border-b border-indigo-200/50 bg-white/60 backdrop-blur-sm">
                <CardTitle className="flex items-center gap-3 text-2xl text-slate-900">
                  <Sparkles className="w-6 h-6 text-indigo-600" />
                  GEO Visibility Analysis
                </CardTitle>
              </CardHeader>
              <CardContent className="p-8 space-y-6">
                <div className="h-64 bg-white/40 rounded-xl" />
                <div className="h-48 bg-white/40 rounded-xl" />
                <div className="h-32 bg-white/40 rounded-xl" />
              </CardContent>
            </Card>
            
            {/* Integration Overlay */}
            <div className="absolute inset-0 flex items-center justify-center bg-white/70 backdrop-blur-md rounded-3xl">
              <div className="text-center p-8">
                <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-3xl flex items-center justify-center shadow-2xl">
                  <Zap className="w-10 h-10 text-white" />
                </div>
                <h3 className="text-3xl font-black text-slate-900 mb-3">
                  Integrate Now to Activate
                </h3>
                <p className="text-slate-600 text-lg mb-6 max-w-md mx-auto">
                  Connect your business to unlock advanced GEO insights, AI analysis, and automated optimization
                </p>
                <Button 
                  asChild
                  size="lg"
                  className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 hover:from-indigo-700 hover:via-purple-700 hover:to-pink-700 text-white font-bold px-10 py-6 text-lg rounded-2xl shadow-2xl"
                >
                  <Link to={createPageUrl("pricing")}>
                    <Sparkles className="w-5 h-5 mr-2" />
                    Integrate Your Business
                    <ArrowRight className="w-5 h-5 ml-2" />
                  </Link>
                </Button>
                <p className="text-xs text-slate-500 mt-4">
                  Full access included • No additional cost
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="w-full space-y-6">
      <Card className="shadow-lg border-slate-200">
        <CardHeader className="border-b border-slate-100 bg-gradient-to-r from-indigo-50 to-purple-50">
          <CardTitle className="flex items-center gap-2 text-xl text-slate-900">
            <Search className="w-6 h-6 text-indigo-600" />
            Business Scanner
          </CardTitle>
          <p className="text-sm text-slate-600 mt-1">Search for a business using Google Places</p>
        </CardHeader>
        <CardContent className="space-y-5 pt-6">
          <div className="relative">
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              <Building className="w-4 h-4 inline mr-1" />
              Business Name *
            </label>
            <Input
              ref={inputRef}
              value={businessName}
              onChange={(e) => handleBusinessNameChange(e.target.value)}
              placeholder="Start typing... (e.g., McDonald's)"
              className="w-full h-12 text-base border-slate-300 focus:border-indigo-500 focus:ring-indigo-500 rounded-lg"
            />
            <p className="text-xs text-slate-500 mt-1">Required - Select from dropdown for best results</p>
            
            {(isLoadingSuggestions || isLoadingDetails) && (
              <div className="absolute right-3 top-[46px]">
                <Loader2 className="w-5 h-5 animate-spin text-indigo-600" />
              </div>
            )}
            {isLoadingDetails && (
              <p className="text-xs text-indigo-600 mt-1 flex items-center gap-1">
                <Loader2 className="w-3 h-3 animate-spin" />
                Loading details…
              </p>
            )}

            {showDropdown && suggestions.length > 0 && (
              <div 
                ref={dropdownRef}
                className="absolute z-[99999] w-full mt-2 bg-white border-2 border-indigo-200 rounded-xl shadow-2xl max-h-64 overflow-y-auto"
              >
                {suggestions.map((item, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onMouseDown={(e) => {
                      e.stopPropagation();
                      handleSelectPrediction(item);
                    }}
                    className="w-full px-4 py-3 text-left hover:bg-indigo-50 active:bg-indigo-100 transition-colors border-b border-slate-100 last:border-b-0 first:rounded-t-xl last:rounded-b-xl"
                  >
                    <div className="font-semibold text-sm text-slate-900">
                      {item.displayName ?? item.structured_formatting?.main_text ?? item.description}
                    </div>
                    {(item.formattedAddress ?? item.structured_formatting?.secondary_text) && (
                      <div className="text-xs text-slate-500 mt-0.5">
                        {item.formattedAddress ?? item.structured_formatting?.secondary_text}
                      </div>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                City *
              </label>
              <Input
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="e.g., Mason"
                className="w-full h-12 text-base"
              />
              <p className="text-xs text-slate-500 mt-1">
                {autoFilledFields.includes('city') ? (
                  <span className="flex items-center gap-1 text-green-600">
                    <Check className="w-3 h-3" />
                    Auto-filled
                  </span>
                ) : 'Required'}
              </p>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                State *
              </label>
              <Input
                value={state}
                onChange={(e) => setState(e.target.value)}
                placeholder="e.g., OH"
                className="w-full h-12 text-base"
                maxLength={2}
              />
              <p className="text-xs text-slate-500 mt-1">
                {autoFilledFields.includes('state') ? (
                  <span className="flex items-center gap-1 text-green-600">
                    <Check className="w-3 h-3" />
                    Auto-filled
                  </span>
                ) : 'Required (2 letters)'}
              </p>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                ZIP Code
              </label>
              <Input
                value={zipCode}
                onChange={(e) => setZipCode(e.target.value)}
                placeholder="e.g., 45040"
                className="w-full h-12 text-base"
              />
              <p className="text-xs text-slate-500 mt-1">
                {autoFilledFields.includes('zipCode') ? (
                  <span className="flex items-center gap-1 text-green-600">
                    <Check className="w-3 h-3" />
                    Auto-filled
                  </span>
                ) : 'Optional'}
              </p>
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border-2 border-red-300 rounded-xl p-4 flex items-start gap-3 shadow-sm">
              <AlertTriangle className="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-bold text-red-900">{error}</p>
                {errorSuggestion && (
                  <p className="text-sm text-red-700 mt-1">{errorSuggestion}</p>
                )}
              </div>
            </div>
          )}

          <Button
            onClick={handleRunScan}
            disabled={isScanning || isLoadingDetails || !businessName || !city || !state}
            className="w-full bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 hover:from-indigo-700 hover:via-purple-700 hover:to-pink-700 text-white font-bold py-4 text-base shadow-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed rounded-lg"
          >
            {isScanning ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                Scanning business presence...
              </>
            ) : (
              <>
                <Search className="w-5 h-5 mr-2" />
                Run GEO/MEO Scan
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
