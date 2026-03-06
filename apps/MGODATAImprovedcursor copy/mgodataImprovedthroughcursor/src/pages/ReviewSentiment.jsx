
import React, { useState, useRef, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Star,
  Loader2,
  Sparkles,
  AlertTriangle,
  ThumbsUp,
  ThumbsDown,
  Meh,
  TrendingUp,
  MessageCircle,
  CheckCircle2,
  Check
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import {
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar
} from 'recharts';

import { useGoogleMaps, usePlacesAutocomplete } from '@/components/utils/useGoogleMaps';

// Sentiment Badge Component
const SentimentBadge = ({ sentiment }) => {
  const configs = {
    positive: {
      icon: ThumbsUp,
      label: 'Positive',
      className: 'bg-green-50 text-green-700 border-green-200'
    },
    neutral: {
      icon: Meh,
      label: 'Neutral',
      className: 'bg-slate-50 text-slate-700 border-slate-200'
    },
    negative: {
      icon: ThumbsDown,
      label: 'Negative',
      className: 'bg-red-50 text-red-700 border-red-200'
    }
  };

  const config = configs[sentiment] || configs.neutral;
  const Icon = config.icon;

  return (
    <Badge className={cn('flex items-center gap-1 border text-xs', config.className)}>
      <Icon className="w-3 h-3" />
      {config.label}
    </Badge>
  );
};

// Review Card Component
const ReviewCard = ({ review, index }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.05 }}
    >
      <Card className="bg-white/80 backdrop-blur-sm border-slate-200/60 shadow-sm hover:shadow-md transition-all">
        <CardContent className="p-4">
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white font-semibold">
                {review.author[0]}
              </div>
              <div>
                <p className="font-semibold text-sm text-slate-900">{review.author}</p>
                <div className="flex items-center gap-2 mt-1">
                  <div className="flex items-center">
                    {[...Array(5)].map((_, i) => (
                      <Star
                        key={i}
                        className={cn(
                          'w-3 h-3',
                          i < review.rating ? 'fill-yellow-400 text-yellow-400' : 'text-slate-300'
                        )}
                      />
                    ))}
                  </div>
                  <span className="text-xs text-slate-500">
                    {new Date(review.time).toLocaleDateString()}
                  </span>
                  <span className="text-xs text-slate-500">•</span>
                  <span className="text-xs text-slate-500">{review.source}</span>
                </div>
              </div>
            </div>
            <SentimentBadge sentiment={review.sentiment} />
          </div>

          <p className="text-sm text-slate-700 leading-relaxed">{review.text}</p>

          {review.topics && review.topics.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-3">
              {review.topics.map((topic, idx) => (
                <Badge key={idx} variant="outline" className="text-xs">
                  {topic}
                </Badge>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
};

// Insight Card Component
const InsightCard = ({ insight, index }) => {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3, delay: index * 0.1 }}
      className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm"
    >
      <div className="flex items-start gap-3">
        <div className="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center flex-shrink-0">
          <Sparkles className="w-4 h-4 text-indigo-600" />
        </div>
        <p className="text-sm text-slate-800 font-medium">{insight}</p>
      </div>
    </motion.div>
  );
};

export default function ReviewSentiment({ user }) {
  const [formData, setFormData] = useState({
    business_name: '',
    city: '',
    state: '',
    use_mock: true
  });
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [autoFilledFields, setAutoFilledFields] = useState([]);
  const businessNameInputRef = useRef(null);

  // Google Maps Integration
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
  }, []); // Memoize the callback

  usePlacesAutocomplete(businessNameInputRef, handlePlaceSelected);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsAnalyzing(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch('/functions/reviewSentimentEngine', {
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
      console.error('Sentiment analysis error:', err);
      setError(err.message || 'An error occurred');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const SENTIMENT_COLORS = {
    positive: '#22c55e',
    neutral: '#94a3b8',
    negative: '#ef4444'
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 p-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
          <MessageCircle className="w-8 h-8 text-indigo-600" />
          AI Review Sentiment Engine
        </h1>
        <p className="text-slate-600 mt-1">Analyze customer feedback sentiment and extract actionable insights</p>
      </div>

      {/* Input Form */}
      <Card className="bg-gradient-to-r from-indigo-50 to-purple-50 border-indigo-200/60 shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-indigo-600" />
            Sentiment Analysis Configuration
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
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.2 }}
                className="p-3 bg-blue-50 border border-blue-200 rounded-lg mb-4"
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
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.2 }}
                className="p-3 bg-amber-50 border border-amber-200 rounded-lg mb-4"
              >
                <p className="text-sm text-amber-800 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4" />
                  Google Places unavailable: {googleMapsError.message} Manual entry required.
                </p>
              </motion.div>
            )}

            {googleMapsLoaded && !googleMapsError && (
              <motion.div
                key="connected"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.2 }}
                className="p-3 bg-green-50 border border-green-200 rounded-lg mb-4"
              >
                <p className="text-sm font-semibold text-green-900 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4" />
                  ✅ Google Maps Autocomplete Connected
                </p>
              </motion.div>
            )}
          </AnimatePresence>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="business_name">Business Name *</Label>
                <Input
                  ref={businessNameInputRef}
                  id="business_name"
                  value={formData.business_name}
                  onChange={(e) => setFormData({...formData, business_name: e.target.value})}
                  placeholder={googleMapsLoaded ? "Start typing..." : "Enter business name"}
                  required
                />
                <p className="text-xs text-slate-500">
                  {googleMapsLoaded ? "Google autocomplete enabled" : "Manual entry"}
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="city">City *</Label>
                <Input
                  id="city"
                  value={formData.city}
                  onChange={(e) => {
                    setFormData({...formData, city: e.target.value});
                    // Clear auto-filled status if user starts typing
                    setAutoFilledFields(prev => prev.filter(field => field !== 'city'));
                  }}
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
                  onChange={(e) => {
                    setFormData({...formData, state: e.target.value});
                    // Clear auto-filled status if user starts typing
                    setAutoFilledFields(prev => prev.filter(field => field !== 'state'));
                  }}
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

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="use_mock"
                checked={formData.use_mock}
                onChange={(e) => setFormData({...formData, use_mock: e.target.checked})}
                className="w-4 h-4 text-indigo-600 rounded"
              />
              <Label htmlFor="use_mock" className="text-sm text-slate-600 cursor-pointer">
                Use demo data (faster analysis)
              </Label>
            </div>

            <Button
              type="submit"
              disabled={isAnalyzing}
              className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700"
            >
              {isAnalyzing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Analyzing Reviews...
                </>
              ) : (
                <>
                  <MessageCircle className="w-4 h-4 mr-2" />
                  Analyze Sentiment
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
                <CardTitle className="text-sm font-medium text-slate-600">Total Reviews</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-4xl font-bold text-indigo-600">{result.total_reviews}</div>
                <p className="text-sm text-slate-500 mt-1">Analyzed</p>
              </CardContent>
            </Card>

            <Card className="bg-white/80 backdrop-blur-sm border-slate-200/60 shadow-lg">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-slate-600">Positive</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-4xl font-bold text-green-600">{result.sentiment.positive_percent}%</div>
                <p className="text-sm text-slate-500 mt-1">{result.sentiment.positive} reviews</p>
              </CardContent>
            </Card>

            <Card className="bg-white/80 backdrop-blur-sm border-slate-200/60 shadow-lg">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-slate-600">Neutral</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-4xl font-bold text-slate-600">{result.sentiment.neutral_percent}%</div>
                <p className="text-sm text-slate-500 mt-1">{result.sentiment.neutral} reviews</p>
              </CardContent>
            </Card>

            <Card className="bg-white/80 backdrop-blur-sm border-slate-200/60 shadow-lg">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-slate-600">Negative</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-4xl font-bold text-red-600">{result.sentiment.negative_percent}%</div>
                <p className="text-sm text-slate-500 mt-1">{result.sentiment.negative} reviews</p>
              </CardContent>
            </Card>
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Sentiment Distribution Pie Chart */}
            <Card className="bg-white/80 backdrop-blur-sm border-slate-200/60 shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-indigo-600" />
                  Sentiment Distribution
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={[
                        { name: 'Positive', value: result.sentiment.positive },
                        { name: 'Neutral', value: result.sentiment.neutral },
                        { name: 'Negative', value: result.sentiment.negative }
                      ]}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      <Cell fill={SENTIMENT_COLORS.positive} />
                      <Cell fill={SENTIMENT_COLORS.neutral} />
                      <Cell fill={SENTIMENT_COLORS.negative} />
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Sentiment Trend Line Chart */}
            <Card className="bg-white/80 backdrop-blur-sm border-slate-200/60 shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-green-600" />
                  Sentiment Trend
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={result.sentiment_trend}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} domain={[0, 100]} />
                    <Tooltip />
                    <Line
                      type="monotone"
                      dataKey="positive_percent"
                      stroke="#22c55e"
                      strokeWidth={3}
                      name="Positive %"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Top Topics Bar Chart */}
          {result.topics && result.topics.length > 0 && (
            <Card className="bg-white/80 backdrop-blur-sm border-slate-200/60 shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageCircle className="w-5 h-5 text-indigo-600" />
                  Most Mentioned Topics
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={result.topics.slice(0, 8)}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="keyword" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip />
                    <Bar dataKey="mentions" fill="#6366f1" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}

          {/* AI Insights and Recommendations */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="bg-gradient-to-br from-indigo-50 to-purple-50 border-indigo-200/60 shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-indigo-600" />
                  AI Summary
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-slate-700 leading-relaxed mb-4">{result.ai_summary}</p>
                <div className="space-y-2">
                  <h4 className="font-semibold text-slate-900 text-sm">Key Insights:</h4>
                  {result.insights.map((insight, idx) => (
                    <InsightCard key={idx} insight={insight} index={idx} />
                  ))}
                </div>
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
                    <div key={idx} className="flex items-start gap-3 p-3 bg-green-50 rounded-lg border border-green-200">
                      <div className="w-6 h-6 rounded-full bg-green-500 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <span className="text-white font-bold text-xs">{idx + 1}</span>
                      </div>
                      <p className="text-sm text-slate-800 font-medium">{rec}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Recent Reviews */}
          <Card className="bg-white/80 backdrop-blur-sm border-slate-200/60 shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Star className="w-5 h-5 text-yellow-500" />
                Recent Reviews
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {result.recent_reviews.map((review, idx) => (
                  <ReviewCard key={idx} review={review} index={idx} />
                ))}
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
