
import React, { useState, useRef, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  BarChart as BarChartIcon,
  Loader2,
  Sparkles,
  AlertTriangle,
  TrendingUp,
  Target,
  Star,
  Users,
  Award,
  Check,
  CheckCircle2 // Added CheckCircle2 icon
} from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { motion, AnimatePresence } from 'framer-motion'; // Added AnimatePresence
import { cn } from '@/lib/utils';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { useGoogleMaps, usePlacesAutocomplete } from '@/components/utils/useGoogleMaps'; // Added custom hooks

// Competitor Table Row
const CompetitorRow = ({ competitor, index, isHighlight }) => {
  const getScoreColor = (score) => {
    if (score >= 80) return 'text-red-600 bg-red-50 border-red-200';
    if (score >= 60) return 'text-amber-600 bg-amber-50 border-amber-200';
    return 'text-green-600 bg-green-50 border-green-200';
  };

  return (
    <motion.tr
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.05 }}
      className={cn(
        "border-b border-slate-200 hover:bg-slate-50 transition-colors",
        isHighlight && "bg-indigo-50"
      )}
    >
      <TableCell className="font-medium">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white font-bold text-sm">
            {index + 1}
          </div>
          <span className="text-slate-900">{competitor.name}</span>
        </div>
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-1">
          <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
          <span className="font-semibold">{competitor.rating}</span>
        </div>
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-1">
          <Users className="w-4 h-4 text-slate-500" />
          <span>{competitor.reviews}</span>
        </div>
      </TableCell>
      <TableCell>
        <Badge variant="outline" className="text-xs">
          {competitor.category}
        </Badge>
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-2">
          <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
            <div 
              className="h-full bg-indigo-600 rounded-full transition-all" 
              style={{ width: `${competitor.keyword_match}%` }}
            />
          </div>
          <span className="text-xs font-medium text-slate-700 w-10 text-right">
            {competitor.keyword_match}%
          </span>
        </div>
      </TableCell>
      <TableCell>
        <Badge className={cn("font-bold border", getScoreColor(competitor.score))}>
          {competitor.score}
        </Badge>
      </TableCell>
    </motion.tr>
  );
};

// Insight Card
const InsightCard = ({ insight, index }) => {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3, delay: index * 0.1 }}
      className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm hover:shadow-md transition-all"
    >
      <div className="flex items-start gap-3">
        <div className="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center flex-shrink-0">
          <Target className="w-4 h-4 text-indigo-600" />
        </div>
        <p className="text-sm text-slate-800 font-medium">{insight}</p>
      </div>
    </motion.div>
  );
};

export default function CompetitorWatchdog({ user }) {
  const [formData, setFormData] = useState({
    business_name: '',
    city: '',
    state: '',
    keyword: ''
  });
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [autoFilledFields, setAutoFilledFields] = useState([]);
  const businessNameInputRef = useRef(null);

  // Google Maps Integration using custom hooks
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
  }, []);

  usePlacesAutocomplete(businessNameInputRef, handlePlaceSelected); // Removed googleMapsLoaded as a direct dependency

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsAnalyzing(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch('/functions/competitorWatchdog', {
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
        throw new Error('Invalid response format: ' + text.slice(0, 200));
      }

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Analysis failed');
      }

      setResult(data);
    } catch (err) {
      console.error('Competitor analysis error:', err);
      setError(err.message || 'An error occurred');
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
          <BarChartIcon className="w-8 h-8 text-indigo-600" />
          AI Competitor Intelligence Dashboard
        </h1>
        <p className="text-slate-600 mt-1">Analyze your competitive landscape and discover strategic advantages</p>
      </div>

      {/* Input Form */}
      <Card className="bg-gradient-to-r from-indigo-50 to-purple-50 border-indigo-200/60 shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-indigo-600" />
            Analysis Configuration
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* Google Maps Status */}
          <AnimatePresence mode="wait">
            {googleMapsLoading && (
              <motion.div
                key="loading"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0, padding: 0, margin: 0 }}
                className="p-3 bg-blue-50 border border-blue-200 rounded-lg mb-4 overflow-hidden"
              >
                <p className="text-sm font-semibold text-blue-900 flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Loading Google Maps services...
                </p>
              </motion.div>
            )}
            
            {googleMapsError && !googleMapsLoading && (
              <motion.div
                key="error"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0, padding: 0, margin: 0 }}
                className="p-3 bg-amber-50 border border-amber-200 rounded-lg mb-4 overflow-hidden"
              >
                <p className="text-sm text-amber-800 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4" />
                  Google Places unavailable: {googleMapsError.message || googleMapsError} Manual entry required.
                </p>
              </motion.div>
            )}
            
            {googleMapsLoaded && !googleMapsError && (
              <motion.div
                key="loaded"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0, padding: 0, margin: 0 }}
                className="p-3 bg-green-50 border border-green-200 rounded-lg mb-4 overflow-hidden"
              >
                <p className="text-sm font-semibold text-green-900 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4" />
                  Google Maps Autocomplete Connected
                </p>
              </motion.div>
            )}
          </AnimatePresence>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="business_name">Your Business Name *</Label>
                <Input
                  ref={businessNameInputRef}
                  id="business_name"
                  value={formData.business_name}
                  onChange={(e) => setFormData({...formData, business_name: e.target.value})}
                  placeholder={googleMapsLoaded ? "Start typing your business name..." : "Joe's Pizza"}
                  required
                />
                <p className="text-xs text-slate-500">
                  {googleMapsLoaded ? "Start typing — suggestions powered by Google" : "Enter business name manually"}
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="keyword">Target Keyword *</Label>
                <Input
                  id="keyword"
                  value={formData.keyword}
                  onChange={(e) => setFormData({...formData, keyword: e.target.value})}
                  placeholder="pizza restaurant"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="city">City *</Label>
                <Input
                  id="city"
                  value={formData.city}
                  onChange={(e) => setFormData({...formData, city: e.target.value})}
                  placeholder="Chicago"
                  required
                />
                {autoFilledFields.includes('city') && (
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
                  onChange={(e) => setFormData({...formData, state: e.target.value})}
                  placeholder="IL"
                  maxLength={2}
                  required
                />
                {autoFilledFields.includes('state') && (
                  <p className="text-xs text-green-600 flex items-center gap-1">
                    <Check className="w-3 h-3" />
                    Auto-filled
                  </p>
                )}
              </div>
            </div>

            <Button
              type="submit"
              disabled={isAnalyzing}
              className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700"
            >
              {isAnalyzing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Analyzing Competition...
                </>
              ) : (
                <>
                  <BarChartIcon className="w-4 h-4 mr-2" />
                  Analyze My Competition
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Error Display */}
      {error && (
        <Card className="bg-red-50 border-2 border-red-200">
          <CardContent className="p-6">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-6 h-6 text-red-600 flex-shrink-0" />
              <div>
                <h4 className="font-bold text-red-900 mb-1">Analysis Error</h4>
                <p className="text-sm text-red-700">{error}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Results */}
      {result && (
        <>
          {/* Overview Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <Card className="bg-white/80 backdrop-blur-sm border-slate-200/60 shadow-lg">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-slate-600">Competitors Found</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-4xl font-bold text-indigo-600">{result.total_analyzed}</div>
                <p className="text-sm text-slate-500 mt-1">Active businesses</p>
              </CardContent>
            </Card>

            <Card className="bg-white/80 backdrop-blur-sm border-slate-200/60 shadow-lg">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-slate-600">Avg Competitor Score</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-4xl font-bold text-slate-900">
                  {Math.round(result.competitors.reduce((sum, c) => sum + c.score, 0) / result.competitors.length)}
                </div>
                <p className="text-sm text-slate-500 mt-1">out of 100</p>
              </CardContent>
            </Card>

            <Card className="bg-white/80 backdrop-blur-sm border-slate-200/60 shadow-lg">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-slate-600">Top Competitor</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-lg font-bold text-slate-900 truncate">
                  {result.competitors[0]?.name || '-'}
                </div>
                <p className="text-sm text-slate-500 mt-1">Score: {result.competitors[0]?.score || 0}</p>
              </CardContent>
            </Card>

            <Card className="bg-white/80 backdrop-blur-sm border-slate-200/60 shadow-lg">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-slate-600">Market Position</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-4xl font-bold text-amber-600">
                  #{result.competitors.findIndex(c => 
                    c.name.toLowerCase().includes(formData.business_name.toLowerCase())
                  ) + 1 || '?'}
                </div>
                <p className="text-sm text-slate-500 mt-1">Your rank</p>
              </CardContent>
            </Card>
          </div>

          {/* Score Distribution Chart */}
          <Card className="bg-white/80 backdrop-blur-sm border-slate-200/60 shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChartIcon className="w-5 h-5 text-indigo-600" />
                Competitive Score Distribution
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={result.competitors.slice(0, 8)}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis 
                    dataKey="name" 
                    tick={{ fontSize: 12 }}
                    angle={-45}
                    textAnchor="end"
                    height={100}
                  />
                  <YAxis tick={{ fontSize: 12 }} domain={[0, 100]} />
                  <Tooltip />
                  <Bar dataKey="score" radius={[8, 8, 0, 0]}>
                    {result.competitors.slice(0, 8).map((entry, index) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={entry.score >= 80 ? '#ef4444' : entry.score >= 60 ? '#f59e0b' : '#6366f1'}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Competitor Table */}
          <Card className="bg-white/80 backdrop-blur-sm border-slate-200/60 shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Award className="w-5 h-5 text-indigo-600" />
                Competitive Analysis
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Competitor</TableHead>
                      <TableHead>Rating</TableHead>
                      <TableHead>Reviews</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Keyword Match</TableHead>
                      <TableHead>Score</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {result.competitors.map((competitor, index) => (
                      <CompetitorRow 
                        key={index} 
                        competitor={competitor} 
                        index={index}
                        isHighlight={competitor.name.toLowerCase().includes(formData.business_name.toLowerCase())}
                      />
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          {/* AI Insights */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="bg-gradient-to-br from-indigo-50 to-purple-50 border-indigo-200/60 shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-indigo-600" />
                  AI Strategic Insights
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-slate-700 leading-relaxed">{result.ai_summary}</p>
              </CardContent>
            </Card>

            <Card className="bg-white/80 backdrop-blur-sm border-slate-200/60 shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-green-600" />
                  Recommended Actions
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {result.recommendations.map((rec, idx) => (
                    <InsightCard key={idx} insight={rec} index={idx} />
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
