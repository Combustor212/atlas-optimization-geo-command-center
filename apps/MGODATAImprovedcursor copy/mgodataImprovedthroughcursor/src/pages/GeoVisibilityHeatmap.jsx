import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  MapPin,
  Loader2,
  Sparkles,
  AlertTriangle,
  Target,
  CheckCircle2,
  Check,
  Info,
  TrendingUp,
  LogIn
} from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MapContainer, TileLayer, Circle, Marker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useGoogleMaps, usePlacesAutocomplete } from '@/components/utils/useGoogleMaps';
import { User } from '@/api/entities';

// Fix Leaflet default marker icons
import L from 'leaflet';
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// ============================================================================
// HELPER COMPONENTS
// ============================================================================

// Map recenter component
function RecenterMap({ position }) {
  const map = useMap();
  
  useEffect(() => {
    if (position && position[0] && position[1]) {
      map.setView(position, 12);
    }
  }, [position, map]);
  
  return null;
}

// Visibility Zone Card Component
const VisibilityZoneCard = ({ zone, index }) => {
  const colorConfig = {
    green: {
      bg: 'from-green-50 to-emerald-50',
      border: 'border-green-200',
      icon: CheckCircle2,
      iconColor: 'text-green-600',
      iconBg: 'bg-green-500',
      label: 'Strong Visibility'
    },
    yellow: {
      bg: 'from-amber-50 to-orange-50',
      border: 'border-amber-200',
      icon: Target,
      iconColor: 'text-amber-600',
      iconBg: 'bg-amber-500',
      label: 'Moderate Visibility'
    },
    red: {
      bg: 'from-red-50 to-pink-50',
      border: 'border-red-200',
      icon: AlertTriangle,
      iconColor: 'text-red-600',
      iconBg: 'bg-red-500',
      label: 'Low/No Visibility'
    }
  };

  const config = colorConfig[zone.color] || colorConfig.red;
  const Icon = config.icon;

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.3, delay: index * 0.1 }}
    >
      <Card className={cn("border-2 shadow-md bg-gradient-to-br hover:shadow-xl transition-shadow", config.bg, config.border)}>
        <CardContent className="p-4">
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center", config.iconBg)}>
                <span className="text-white font-bold text-sm">{zone.radius}mi</span>
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-900">{zone.radius} Mile Radius</p>
                <p className="text-xs text-slate-600">{config.label}</p>
              </div>
            </div>
            <Icon className={cn("w-5 h-5", config.iconColor)} />
          </div>
          
          <div className="space-y-2">
            {zone.rank ? (
              <>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-600">Your Rank:</span>
                  <Badge className="bg-white border border-slate-300 text-slate-900 font-bold">
                    #{zone.rank}
                  </Badge>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-600">Total Competitors:</span>
                  <span className="font-semibold text-slate-900">{zone.total}</span>
                </div>
              </>
            ) : (
              <div className="text-sm text-slate-600 italic">
                Not visible in search results
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};

// Score Card Component
const ScoreCard = ({ title, value, subtitle, icon: Icon, gradient }) => (
  <Card className={cn("bg-gradient-to-br shadow-lg border-0 hover:shadow-xl transition-shadow", gradient)}>
    <CardHeader className="pb-3">
      <CardTitle className="text-sm font-medium text-slate-600 flex items-center gap-2">
        <Icon className="w-4 h-4" />
        {title}
      </CardTitle>
    </CardHeader>
    <CardContent>
      <div className="text-4xl font-bold text-slate-900">{value}</div>
      {subtitle && <p className="text-sm text-slate-500 mt-1">{subtitle}</p>}
    </CardContent>
  </Card>
);

// Loading Skeleton for Results
const ResultsSkeleton = () => (
  <div className="space-y-6">
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {[1, 2, 3].map((i) => (
        <Card key={i} className="shadow-lg">
          <CardContent className="p-6">
            <Skeleton className="h-24 w-full" />
          </CardContent>
        </Card>
      ))}
    </div>
    <Card className="shadow-lg">
      <CardContent className="p-6">
        <Skeleton className="h-96 w-full" />
      </CardContent>
    </Card>
  </div>
);

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function GeoVisibilityHeatmap({ user }) {
  // ========== STATE MANAGEMENT ==========
  const [formData, setFormData] = useState({
    business_name: '',
    city: '',
    state: '',
    keyword: '',
    max_radius: 5
  });
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [autoFilledFields, setAutoFilledFields] = useState([]);
  const [manualEditMode, setManualEditMode] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authChecking, setAuthChecking] = useState(true);
  
  const businessNameInputRef = useRef(null);
  
  // ========== AUTHENTICATION CHECK ==========
  useEffect(() => {
    const checkAuth = async () => {
      try {
        await User.me();
        setIsAuthenticated(true);
      } catch (err) {
        setIsAuthenticated(false);
      } finally {
        setAuthChecking(false);
      }
    };
    checkAuth();
  }, []);
  
  // ========== GOOGLE MAPS INTEGRATION ==========
  const { isLoaded: googleMapsLoaded, error: googleMapsError, isLoading: googleMapsLoading } = useGoogleMaps();

  const handlePlaceSelected = useCallback((placeData) => {
    setFormData(prev => ({
      ...prev,
      business_name: placeData.business_name,
      city: placeData.city,
      state: placeData.state
    }));
    
    const filled = [];
    if (placeData.city) filled.push('city');
    if (placeData.state) filled.push('state');
    setAutoFilledFields(filled);
    setManualEditMode(false);
  }, []);

  usePlacesAutocomplete(businessNameInputRef, handlePlaceSelected);

  // ========== EVENT HANDLERS ==========
  const handleManualEdit = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (!manualEditMode && googleMapsLoaded && autoFilledFields.includes(field)) {
      setManualEditMode(true);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Check authentication before submitting
    if (!isAuthenticated) {
      setError("You must be logged in to generate a heatmap. Please sign in to continue.");
      return;
    }
    
    setIsAnalyzing(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch('/functions/geoVisibilityHeatmap', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(formData)
      });

      const text = await response.text();
      
      if (text.trim().startsWith('<!DOCTYPE') || text.trim().startsWith('<html')) {
        throw new Error('Server error - received HTML instead of JSON');
      }

      let data;
      try {
        data = JSON.parse(text);
      } catch (parseError) {
        throw new Error('Invalid response format from server');
      }

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Analysis failed');
      }

      setResult(data);
    } catch (err) {
      console.error('Heatmap error:', err);
      setError(err.message || 'An unexpected error occurred');
    } finally {
      setIsAnalyzing(false);
    }
  };

  // ========== RENDER ==========
  return (
    <div className="max-w-7xl mx-auto space-y-6 p-6">
      
      {/* ========== HEADER SECTION ========== */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center shadow-lg">
            <MapPin className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-slate-900">
              AI GEO Visibility Heatmap
            </h1>
            <p className="text-slate-600">Analyze your local search visibility across different distances</p>
          </div>
        </div>
      </div>

      {/* ========== AUTHENTICATION WARNING ========== */}
      {!authChecking && !isAuthenticated && (
        <Card className="bg-gradient-to-r from-amber-50 to-orange-50 border-amber-200 shadow-lg">
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-amber-100 flex items-center justify-center flex-shrink-0">
                <LogIn className="w-6 h-6 text-amber-600" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-bold text-amber-900 mb-2">Authentication Required</h3>
                <p className="text-sm text-amber-800 mb-4">
                  You need to be logged in to generate visibility heatmaps. The form is available for preview, but you must sign in to run the analysis.
                </p>
                <Button 
                  onClick={() => User.login()}
                  className="bg-amber-600 hover:bg-amber-700"
                >
                  <LogIn className="w-4 h-4 mr-2" />
                  Sign In to Continue
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ========== CONFIGURATION SECTION ========== */}
      <Card className="bg-gradient-to-r from-indigo-50 to-purple-50 border-indigo-200/60 shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-indigo-600" />
            Heatmap Configuration
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* Google Maps Status Indicators */}
          <AnimatePresence mode="wait">
            {googleMapsLoading && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="p-3 bg-blue-50 border border-blue-200 rounded-lg flex items-start gap-2 mb-4"
              >
                <Loader2 className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5 animate-spin" />
                <p className="text-sm font-semibold text-blue-900">Loading Google Maps services...</p>
              </motion.div>
            )}
            
            {googleMapsError && !googleMapsLoading && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-2 mb-4"
              >
                <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-semibold text-amber-900">Google Places Autocomplete Unavailable</p>
                  <p className="text-xs text-amber-700 mt-1">Manual entry required. Error: {googleMapsError.message || "Unknown error"}</p>
                </div>
              </motion.div>
            )}
            
            {googleMapsLoaded && !googleMapsError && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="p-3 bg-green-50 border border-green-200 rounded-lg flex items-start gap-2 mb-4"
              >
                <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
                <p className="text-sm font-semibold text-green-900">✅ Google Maps Autocomplete Connected</p>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Business Name */}
              <div className="space-y-2">
                <Label htmlFor="business_name">Business Name *</Label>
                <Input
                  ref={businessNameInputRef}
                  id="business_name"
                  value={formData.business_name}
                  onChange={(e) => setFormData({...formData, business_name: e.target.value})}
                  placeholder={googleMapsLoaded ? "Start typing your business name..." : "Enter business name"}
                  required
                  disabled={isAnalyzing}
                  className="h-12"
                />
                <p className="text-xs text-slate-500 flex items-center gap-1">
                  {googleMapsLoaded && !googleMapsError ? (
                    <>
                      <Info className="w-3 h-3" />
                      Start typing — suggestions powered by Google
                    </>
                  ) : googleMapsLoading ? (
                    <>
                      <Loader2 className="w-3 h-3 animate-spin" />
                      Loading Google Places...
                    </>
                  ) : (
                    <>
                      <Info className="w-3 h-3" />
                      Enter business name manually
                    </>
                  )}
                </p>
              </div>

              {/* Keyword */}
              <div className="space-y-2">
                <Label htmlFor="keyword">Keyword/Category *</Label>
                <Input
                  id="keyword"
                  value={formData.keyword}
                  onChange={(e) => setFormData({...formData, keyword: e.target.value})}
                  placeholder="e.g., pizza restaurant"
                  required
                  disabled={isAnalyzing}
                  className="h-12"
                />
              </div>

              {/* City */}
              <div className="space-y-2">
                <Label htmlFor="city">City *</Label>
                <Input
                  id="city"
                  value={formData.city}
                  onChange={(e) => handleManualEdit('city', e.target.value)}
                  placeholder="e.g., Chicago"
                  required
                  disabled={isAnalyzing}
                  className="h-12"
                />
                {autoFilledFields.includes('city') && !manualEditMode && (
                  <p className="text-xs text-green-600 flex items-center gap-1">
                    <Check className="w-3 h-3" />
                    Auto-filled
                  </p>
                )}
              </div>

              {/* State */}
              <div className="space-y-2">
                <Label htmlFor="state">State *</Label>
                <Input
                  id="state"
                  value={formData.state}
                  onChange={(e) => handleManualEdit('state', e.target.value)}
                  placeholder="e.g., IL"
                  maxLength={2}
                  required
                  disabled={isAnalyzing}
                  className="h-12 uppercase"
                />
                {autoFilledFields.includes('state') && !manualEditMode && (
                  <p className="text-xs text-green-600 flex items-center gap-1">
                    <Check className="w-3 h-3" />
                    Auto-filled
                  </p>
                )}
              </div>

              {/* Max Radius */}
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="max_radius">Maximum Radius</Label>
                <Select
                  value={formData.max_radius.toString()}
                  onValueChange={(value) => setFormData({...formData, max_radius: parseInt(value)})}
                  disabled={isAnalyzing}
                >
                  <SelectTrigger className="h-12">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1 mile</SelectItem>
                    <SelectItem value="2">2 miles</SelectItem>
                    <SelectItem value="3">3 miles</SelectItem>
                    <SelectItem value="5">5 miles</SelectItem>
                    <SelectItem value="10">10 miles</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              disabled={isAnalyzing || googleMapsLoading || !isAuthenticated}
              className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 h-12 text-base font-semibold shadow-lg"
            >
              {isAnalyzing ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Analyzing Visibility...
                </>
              ) : !isAuthenticated ? (
                <>
                  <LogIn className="w-5 h-5 mr-2" />
                  Sign In to Generate Heatmap
                </>
              ) : (
                <>
                  <Target className="w-5 h-5 mr-2" />
                  Generate Heatmap
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* ========== ERROR SECTION ========== */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            <Card className="bg-red-50 border-2 border-red-200 shadow-lg">
              <CardContent className="p-6">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-bold text-red-900 mb-1">Analysis Error</h4>
                    <p className="text-sm text-red-700">{error}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ========== LOADING STATE ========== */}
      {isAnalyzing && <ResultsSkeleton />}

      {/* ========== RESULTS SECTION ========== */}
      <AnimatePresence>
        {result && !isAnalyzing && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="space-y-6"
          >
            {/* Score Overview Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <ScoreCard
                title="Visibility Score"
                value={result.average_score || 0}
                subtitle="out of 100"
                icon={TrendingUp}
                gradient="from-indigo-50 to-indigo-100"
              />
              <ScoreCard
                title="Visible Zones"
                value={`${result.visibility_zones?.filter(z => z.visible).length || 0}/${result.visibility_zones?.length || 0}`}
                subtitle="radii tested"
                icon={CheckCircle2}
                gradient="from-green-50 to-green-100"
              />
              <ScoreCard
                title="Best Rank"
                value={`#${Math.min(...(result.visibility_zones?.filter(z => z.rank).map(z => z.rank) || [999]))}`}
                subtitle="closest radius"
                icon={Target}
                gradient="from-purple-50 to-purple-100"
              />
            </div>

            {/* Interactive Map */}
            {result.business_location && (
              <Card className="bg-white/80 backdrop-blur-sm border-slate-200/60 shadow-lg">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MapPin className="w-5 h-5 text-indigo-600" />
                    Visibility Heatmap
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-[500px] rounded-lg overflow-hidden border-2 border-slate-200 mb-4">
                    <MapContainer
                      center={[result.business_location.lat, result.business_location.lng]}
                      zoom={12}
                      style={{ height: '100%', width: '100%' }}
                      scrollWheelZoom={false}
                    >
                      <TileLayer
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                      />
                      <RecenterMap position={[result.business_location.lat, result.business_location.lng]} />
                      
                      {/* Business Location Marker */}
                      <Marker position={[result.business_location.lat, result.business_location.lng]}>
                        <Popup>
                          <div className="text-center p-2">
                            <p className="font-bold text-slate-900">{result.business_location.name}</p>
                            <p className="text-xs text-slate-600 mt-1">{result.business_location.address}</p>
                          </div>
                        </Popup>
                      </Marker>

                      {/* Visibility Circles */}
                      {result.visibility_zones?.map((zone, idx) => (
                        <Circle
                          key={idx}
                          center={[result.business_location.lat, result.business_location.lng]}
                          radius={zone.radius * 1609.34} // Convert miles to meters
                          pathOptions={{
                            color: zone.color === 'green' ? '#22c55e' : zone.color === 'yellow' ? '#f59e0b' : '#ef4444',
                            fillColor: zone.color === 'green' ? '#22c55e' : zone.color === 'yellow' ? '#f59e0b' : '#ef4444',
                            fillOpacity: 0.1,
                            weight: 2
                          }}
                        >
                          <Popup>
                            <div className="text-center p-2">
                              <p className="font-bold text-sm">{zone.radius} Mile Radius</p>
                              <p className="text-xs mt-1">
                                {zone.rank ? `Rank #${zone.rank} of ${zone.total}` : 'Not visible'}
                              </p>
                            </div>
                          </Popup>
                        </Circle>
                      ))}
                    </MapContainer>
                  </div>

                  {/* Map Legend */}
                  <div className="flex items-center justify-center gap-6 text-sm bg-slate-50 rounded-lg p-3">
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 rounded bg-green-500 shadow-sm" />
                      <span className="text-slate-700 font-medium">Top 3 (Strong)</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 rounded bg-amber-500 shadow-sm" />
                      <span className="text-slate-700 font-medium">Rank 4-10 (Moderate)</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 rounded bg-red-500 shadow-sm" />
                      <span className="text-slate-700 font-medium">Not Visible (Weak)</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Visibility Zones Breakdown */}
            {result.visibility_zones && result.visibility_zones.length > 0 && (
              <div>
                <h2 className="text-2xl font-bold text-slate-900 mb-4 flex items-center gap-2">
                  <Target className="w-6 h-6 text-indigo-600" />
                  Visibility by Distance
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {result.visibility_zones.map((zone, idx) => (
                    <VisibilityZoneCard key={idx} zone={zone} index={idx} />
                  ))}
                </div>
              </div>
            )}

            {/* AI Insights */}
            {result.ai_summary && (
              <Card className="bg-gradient-to-br from-indigo-50 to-purple-50 border-indigo-200/60 shadow-lg">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-indigo-600" />
                    AI Strategic Insights
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-slate-700 leading-relaxed text-base">
                    {result.ai_summary}
                  </p>
                </CardContent>
              </Card>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}