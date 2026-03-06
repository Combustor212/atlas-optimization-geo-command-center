
import React, { useState, useEffect, useMemo } from 'react';
import { Business } from '@/api/entities';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  Star, 
  Search,
  ThumbsUp,
  ThumbsDown,
  Meh,
  Sparkles,
  MessageCircle,
  ChevronDown,
  Lightbulb,
  MessageSquare, // Added for MetricCard
  TrendingUp // Added for MetricCard
} from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from '@/lib/utils';
import { format } from 'date-fns'; // Fixed syntax error
import { InvokeLLM } from '@/api/integrations'; // Fixed syntax error
import { toast } from 'sonner'; // Fixed syntax error

// KPI Metric Card
const MetricCard = ({ title, value, trend, icon: Icon, color, trendUp }) => {
  return (
    <Card className="bg-white/80 backdrop-blur-sm border-slate-200/60 shadow-md hover:shadow-lg transition-all">
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-3">
          <div className={cn(
            "w-12 h-12 rounded-xl flex items-center justify-center",
            color === 'green' && 'bg-green-100',
            color === 'violet' && 'bg-violet-100',
            color === 'amber' && 'bg-amber-100',
            color === 'blue' && 'bg-blue-100'
          )}>
            <Icon className={cn(
              "w-6 h-6",
              color === 'green' && 'text-green-600',
              color === 'violet' && 'text-violet-600',
              color === 'amber' && 'text-amber-600',
              color === 'blue' && 'text-blue-600'
            )} />
          </div>
          {trend && (
            <Badge className={cn(
              "font-semibold",
              trendUp ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-700 border-red-200'
            )}>
              {trendUp ? '+' : ''}{trend}
            </Badge>
          )}
        </div>
        <div>
          <p className="text-sm font-medium text-slate-500 mb-1">{title}</p>
          <p className="text-3xl font-bold text-slate-900">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
};

// Sentiment Breakdown Chart
const SentimentBreakdown = ({ reviews }) => {
  const sentiments = useMemo(() => {
    const total = reviews.length;
    if (total === 0) return { positive: 0, neutral: 0, negative: 0 };
    
    const counts = reviews.reduce((acc, review) => {
      acc[review.sentiment] = (acc[review.sentiment] || 0) + 1;
      return acc;
    }, {});

    return {
      positive: Math.round((counts.positive || 0) / total * 100),
      neutral: Math.round((counts.neutral || 0) / total * 100),
      negative: Math.round((counts.negative || 0) / total * 100)
    };
  }, [reviews]);

  return (
    <div className="space-y-4">
      <div>
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-slate-700">Positive</span>
          <span className="text-sm font-semibold text-green-600">{sentiments.positive}%</span>
        </div>
        <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
          <div className="h-full bg-green-500 rounded-full" style={{ width: `${sentiments.positive}%` }} />
        </div>
      </div>
      <div>
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-slate-700">Neutral</span>
          <span className="text-sm font-semibold text-slate-600">{sentiments.neutral}%</span>
        </div>
        <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
          <div className="h-full bg-slate-400 rounded-full" style={{ width: `${sentiments.neutral}%` }} />
        </div>
      </div>
      <div>
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-slate-700">Negative</span>
          <span className="text-sm font-semibold text-red-600">{sentiments.negative}%</span>
        </div>
        <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
          <div className="h-full bg-red-500 rounded-full" style={{ width: `${sentiments.negative}%` }} />
        </div>
      </div>
    </div>
  );
};

// Generate fewer, higher-quality sample reviews
const generateSampleReviews = (businesses) => {
  const reviewTemplates = [
    { rating: 5, sentiment: 'positive', template: 'Absolutely fantastic service in {city}! The team was professional, quick, and exceeded all my expectations. I found them through a local search and I\'m so glad I did. Will definitely be returning to this {city} location.' },
    { rating: 5, sentiment: 'positive', template: 'Outstanding work! Best {niche} in {city} by far. Professional, courteous, and delivered exactly what they promised. Highly recommend to anyone in the {city} area looking for quality service.' },
    { rating: 4, sentiment: 'positive', template: 'Great experience overall. The staff was friendly and knowledgeable about local needs in {city}. Only minor issue was the wait time, but the quality of work made up for it. Would recommend to friends.' },
    { rating: 3, sentiment: 'neutral', template: 'Decent service. Nothing special but nothing terrible either. Average experience for a {niche} in {city} area. Got the job done but didn\'t exceed expectations.' },
    { rating: 2, sentiment: 'negative', template: 'Not impressed with this {city} location. Service was slow and staff seemed disorganized. Expected better based on other {city} reviews I read online. May try elsewhere next time.' }
  ];

  const names = [
    'Sarah Johnson', 'Michael Chen', 'Emily Rodriguez', 'David Martinez', 'Jennifer Lee',
    'Robert Taylor', 'Amanda White', 'James Brown', 'Lisa Anderson', 'Christopher Davis'
  ];

  const sources = ['Google', 'Yelp', 'Facebook', 'Google', 'Google'];

  const reviews = [];
  let reviewId = 1;

  businesses.forEach(business => {
    const numReviews = Math.min(Math.floor(Math.random() * 3) + 4, 6); // 4-6 reviews per business
    for (let i = 0; i < numReviews; i++) {
      const template = reviewTemplates[Math.floor(Math.random() * reviewTemplates.length)];
      const text = template.template
        .replace(/{city}/g, business.city || 'the area')
        .replace(/{niche}/g, business.category || 'business');

      reviews.push({
        id: `${reviewId++}`,
        businessId: business.id,
        author: names[Math.floor(Math.random() * names.length)],
        rating: template.rating,
        sentiment: template.sentiment,
        text: text,
        date: new Date(Date.now() - Math.random() * 60 * 24 * 60 * 60 * 1000),
        source: sources[Math.floor(Math.random() * sources.length)],
        isImproved: false,
        reply: null
      });
    }
  });

  return reviews.sort((a, b) => b.date - a.date);
};

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

// Star Rating Display
const StarRating = ({ rating }) => {
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          className={cn(
            'w-3.5 h-3.5',
            star <= rating ? 'fill-yellow-400 text-yellow-400' : 'text-slate-300'
          )}
        />
      ))}
      <span className="ml-1 text-sm font-semibold text-slate-700">{rating}.0</span>
    </div>
  );
};

// Compact Review Card Component
const ReviewCard = ({ review, business, onImprove, onReply, isProcessing, processingType }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const needsExpansion = review.text.length > 150;
  // Fix: Use 'needsExpansion' consistently instead of 'needsExpanded'
  const displayText = needsExpansion && !isExpanded ? review.text.slice(0, 150) + '...' : review.text;

  return (
    <Card className="bg-white/80 backdrop-blur-sm border-slate-200/60 shadow-sm hover:shadow-md transition-all">
      <CardContent className="p-4">
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-violet-500 to-purple-500 flex items-center justify-center text-white font-semibold text-sm">
              {review.author[0]}
            </div>
            <div>
              <p className="font-semibold text-sm text-slate-900">{review.author}</p>
              <div className="flex items-center gap-2 mt-0.5">
                <StarRating rating={review.rating} />
                <span className="text-xs text-slate-400">•</span>
                <span className="text-xs text-slate-500">{format(review.date, 'MMM d, yyyy')}</span>
                <span className="text-xs text-slate-400">•</span>
                <span className="text-xs text-slate-500">{review.source}</span>
              </div>
            </div>
          </div>
          <SentimentBadge sentiment={review.sentiment} />
        </div>

        {/* Review Text */}
        <p className="text-slate-600 text-sm leading-relaxed mb-3">
          {displayText}
          {needsExpansion && ( // Fix: Use 'needsExpansion' consistently
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="text-violet-600 hover:text-violet-700 font-medium ml-1"
            >
              {isExpanded ? 'Show less' : 'Read more'}
            </button>
          )}
        </p>

        {/* Badges */}
        <div className="flex items-center gap-2 mb-3">
          {review.isImproved && (
            <Badge className="text-xs bg-violet-100 text-violet-700 border-violet-200">
              <Sparkles className="w-2.5 h-2.5 mr-1" />
              AI Enhanced
            </Badge>
          )}
          {review.reply && (
            <Badge className="text-xs bg-blue-100 text-blue-700 border-blue-200">
              <MessageCircle className="w-2.5 h-2.5 mr-1" />
              Replied
            </Badge>
          )}
        </div>

        {/* AI Reply Display */}
        {review.reply && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-3">
            <div className="flex items-center gap-2 mb-2">
              <MessageCircle className="w-4 h-4 text-blue-600" />
              <span className="text-xs font-semibold text-blue-900">Your Reply</span>
            </div>
            <p className="text-sm text-slate-700 leading-relaxed">{review.reply}</p>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-2">
          <Button 
            size="sm" 
            onClick={() => onImprove(review)}
            disabled={isProcessing}
            className="bg-gradient-to-r from-violet-500 to-purple-500 hover:from-violet-600 hover:to-purple-600 text-white text-xs h-8 px-3 rounded-full"
          >
            <Sparkles className="w-3 h-3 mr-1" />
            {isProcessing && processingType === 'improve' ? 'Improving...' : 'Improve'}
          </Button>
          <Button 
            size="sm" 
            onClick={() => onReply(review)}
            disabled={isProcessing || review.reply}
            variant="outline"
            className="text-xs h-8 px-3 rounded-full border-violet-300 text-violet-700 hover:bg-violet-50"
          >
            <MessageCircle className="w-3 h-3 mr-1" />
            {isProcessing && processingType === 'reply' ? 'Generating...' : review.reply ? 'Replied' : 'Reply with AI'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

// GEO Suggestions Sidebar
const GEOSuggestions = ({ businesses }) => {
  const suggestions = businesses.slice(0, 2).map(business => ({
    business: business.name,
    city: business.city,
    keywords: [
      `best ${business.category} in ${business.city}`,
      `${business.city} ${business.category} near me`,
      `trusted ${business.category} ${business.city}`
    ]
  }));

  return (
    <Card className="bg-gradient-to-br from-indigo-50 to-purple-50 border-indigo-200/60 sticky top-6">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Lightbulb className="w-4 h-4 text-indigo-600" />
          GEO Keywords
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {suggestions.map((suggestion, idx) => (
          <div key={idx}>
            <p className="text-sm font-semibold text-slate-900 mb-2">{suggestion.business}</p>
            <div className="space-y-1">
              {suggestion.keywords.map((kw, i) => (
                <div key={i} className="text-xs text-slate-600 bg-white rounded px-2 py-1 border border-slate-200">
                  "{kw}"
                </div>
              ))}
            </div>
          </div>
        ))}
        <p className="text-xs text-slate-500 pt-2 border-t border-indigo-200">
          Use these keywords in your replies to boost local visibility in AI search engines.
        </p>
      </CardContent>
    </Card>
  );
};

export default function ReputationManager({ user }) {
  const [reviews, setReviews] = useState([]);
  const [businesses, setBusinesses] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [processingReviewId, setProcessingReviewId] = useState(null);
  const [processingType, setProcessingType] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [displayLimit, setDisplayLimit] = useState(5);
  const [filters, setFilters] = useState({
    sentiment: 'all',
    source: 'all',
    hasReply: 'all' // Added new filter option
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const businessesData = await Business.list();
      setBusinesses(businessesData || []);
      
      if (businessesData && businessesData.length > 0) {
        const sampleReviews = generateSampleReviews(businessesData);
        setReviews(sampleReviews);
      }
    } catch (error) {
      console.error('Error loading reputation data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGenerateReviews = async () => {
    if (businesses.length === 0) {
      toast.error('Please add businesses first');
      return;
    }

    setIsGenerating(true);
    try {
      const business = businesses[0];
      const prompt = `Generate 3 realistic customer reviews for a ${business.category} business in ${business.city}. 
      Mix sentiments: one positive (4-5 stars), one neutral (3 stars), one mixed/negative (1-2 stars).
      Each review should:
      - Include the city name naturally
      - Sound authentic with varied length (50-120 words)
      - Include specific details about the service
      - Use local context (e.g., "near downtown ${business.city}")
      
      Return as JSON array with: author (realistic full name), rating (1-5), text, sentiment (positive/neutral/negative)`;

      const result = await InvokeLLM({
        prompt,
        response_json_schema: {
          type: 'object',
          properties: {
            reviews: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  author: { type: 'string' },
                  rating: { type: 'number' },
                  text: { type: 'string' },
                  sentiment: { type: 'string' }
                }
              }
            }
          }
        }
      });

      const newReviews = result.reviews.map((r, idx) => ({
        id: `ai-${Date.now()}-${idx}`,
        businessId: business.id,
        author: r.author,
        rating: r.rating,
        sentiment: r.sentiment,
        text: r.text,
        date: new Date(),
        source: 'Google',
        isImproved: false,
        reply: null
      }));

      setReviews(prev => [...newReviews, ...prev]);
      toast.success(`Generated ${newReviews.length} new reviews!`);
    } catch (error) {
      console.error('Error generating reviews:', error);
      toast.error('Failed to generate reviews');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleImproveReview = async (review) => {
    setProcessingReviewId(review.id);
    setProcessingType('improve');
    try {
      const business = businesses.find(b => b.id === review.businessId);
      const prompt = `Improve this customer review to be more GEO-optimized while keeping the exact same sentiment (${review.sentiment}) and star rating.

Original review: "${review.text}"

Business: ${business?.category || 'business'} in ${business?.city || 'the area'}

Make it:
- More professional and clear
- Include local keywords naturally (e.g., "best ${business?.category} in ${business?.city}")
- Add specific location references if appropriate
- Keep the same sentiment and rating (${review.rating} stars)
- Make it feel authentic, not promotional

Return only the improved review text.`;

      const improvedText = await InvokeLLM({ prompt });

      setReviews(prev => prev.map(r => 
        r.id === review.id 
          ? { ...r, text: improvedText, isImproved: true }
          : r
      ));

      toast.success('Review enhanced with AI!');
    } catch (error) {
      console.error('Error improving review:', error);
      toast.error('Failed to improve review');
    } finally {
      setProcessingReviewId(null);
      setProcessingType(null);
    }
  };

  const handleReplyToReview = async (review) => {
    setProcessingReviewId(review.id);
    setProcessingType('reply');
    try {
      const business = businesses.find(b => b.id === review.businessId);
      
      let toneInstructions = '';
      if (review.sentiment === 'positive') {
        toneInstructions = 'Write a friendly, appreciative response thanking them for their business.';
      } else if (review.sentiment === 'negative') {
        toneInstructions = 'Write an empathetic, apologetic response acknowledging their concerns and offering to make things right.';
      } else {
        toneInstructions = 'Write a professional, neutral response thanking them for their feedback.';
      }

      const prompt = `Generate a professional business reply to this ${review.sentiment} customer review.

Review: "${review.text}"
Rating: ${review.rating} stars

Business: ${business?.category || 'business'} in ${business?.city}

${toneInstructions}

The reply should:
- Be 2-3 sentences
- Include the city/location naturally (e.g., "here in ${business?.city}")
- Sound genuine and personalized
- Match the sentiment appropriately
- Include local keywords for GEO optimization

Return only the reply text, no quotes or extra formatting.`;

      const replyText = await InvokeLLM({ prompt });

      setReviews(prev => prev.map(r => 
        r.id === review.id 
          ? { ...r, reply: replyText }
          : r
      ));

      toast.success('AI reply generated!');
    } catch (error) {
      console.error('Error generating reply:', error);
      toast.error('Failed to generate reply');
    } finally {
      setProcessingReviewId(null);
      setProcessingType(null);
    }
  };

  const businessMap = useMemo(() => new Map(businesses.map(b => [b.id, b])), [businesses]);

  const filteredReviews = useMemo(() => {
    return reviews.filter(review => {
      const searchMatch = 
        review.author.toLowerCase().includes(searchTerm.toLowerCase()) ||
        review.text.toLowerCase().includes(searchTerm.toLowerCase());
      
      const sentimentMatch = filters.sentiment === 'all' || review.sentiment === filters.sentiment;
      const sourceMatch = filters.source === 'all' || review.source === filters.source;
      // New filter logic
      const replyMatch = filters.hasReply === 'all' || 
        (filters.hasReply === 'replied' && review.reply) ||
        (filters.hasReply === 'no_reply' && !review.reply);

      return searchMatch && sentimentMatch && sourceMatch && replyMatch; // Updated return
    });
  }, [reviews, searchTerm, filters]);

  const displayedReviews = filteredReviews.slice(0, displayLimit);
  const hasMore = filteredReviews.length > displayLimit;

  // Calculate metrics
  const newReviewsThisMonth = reviews.filter(r => {
    const reviewDate = new Date(r.date);
    const now = new Date();
    return reviewDate.getMonth() === now.getMonth() && reviewDate.getFullYear() === now.getFullYear();
  }).length;

  const avgRating = reviews.length > 0
    ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1)
    : '0.0';

  const aiRepliesCount = reviews.filter(r => r.reply).length;

  // Calculate review growth relative to all previous reviews
  const totalPreviousReviews = reviews.length - newReviewsThisMonth;
  const reviewGrowth = totalPreviousReviews > 0
    ? Math.round((newReviewsThisMonth / totalPreviousReviews) * 100)
    : (newReviewsThisMonth > 0 ? 100 : 0); // If no previous reviews but new reviews exist, show 100% growth. If no reviews at all, 0%.


  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50/20">
      <div className="max-w-7xl mx-auto p-6">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-8">
          {/* Main Content */}
          <div className="space-y-6">
            {/* Header */}
            <div className="flex justify-between items-start">
              <div>
                <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
                  <Star className="w-8 h-8 text-violet-600 fill-violet-600" />
                  Reputation Manager
                </h1>
                <p className="text-slate-600 mt-1">Monitor and respond to reviews with AI assistance</p>
              </div>
              <Button
                onClick={handleGenerateReviews}
                disabled={isGenerating}
                className="bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white shadow-sm"
              >
                {isGenerating ? (
                  <>
                    <Sparkles className="w-4 h-4 mr-2 animate-pulse" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 mr-2" />
                    Generate Reviews
                  </>
                )}
              </Button>
            </div>

            {/* Dashboard Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <MetricCard
                title="New Reviews"
                value={newReviewsThisMonth}
                trend="+12%" // Hardcoded trend as per outline
                trendUp={true}
                icon={MessageSquare}
                color="green"
              />
              <MetricCard
                title="Avg Rating"
                value={avgRating}
                trend="+0.2" // Hardcoded trend as per outline
                trendUp={true}
                icon={Star}
                color="amber"
              />
              <MetricCard
                title="AI Responses"
                value={aiRepliesCount}
                trend="+18%" // Hardcoded trend as per outline
                trendUp={true}
                icon={Sparkles}
                color="violet"
              />
              <MetricCard
                title="Review Growth"
                value={`${reviewGrowth}%`}
                trend={reviewGrowth > 0 ? `+${reviewGrowth}%` : `${reviewGrowth}%`}
                trendUp={reviewGrowth > 0}
                icon={TrendingUp}
                color="blue"
              />
            </div>

            {/* Filters */}
            <Card className="bg-white/80 backdrop-blur-sm border-slate-200/60 shadow-sm">
              <CardContent className="p-4">
                <div className="flex flex-col md:flex-row gap-3">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <Input
                      placeholder="Search reviews..."
                      className="pl-10 h-10 bg-white border-slate-200"
                      value={searchTerm}
                      onChange={e => setSearchTerm(e.target.value)}
                    />
                  </div>
                  
                  <Select value={filters.sentiment} onValueChange={v => setFilters(f => ({ ...f, sentiment: v }))}>
                    <SelectTrigger className="w-full md:w-[150px] h-10 bg-white">
                      <SelectValue placeholder="Sentiment" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Sentiments</SelectItem>
                      <SelectItem value="positive">Positive</SelectItem>
                      <SelectItem value="neutral">Neutral</SelectItem>
                      <SelectItem value="negative">Negative</SelectItem>
                    </SelectContent>
                  </Select>

                  <Select value={filters.source} onValueChange={v => setFilters(f => ({ ...f, source: v }))}>
                    <SelectTrigger className="w-full md:w-[140px] h-10 bg-white">
                      <SelectValue placeholder="Source" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Sources</SelectItem>
                      <SelectItem value="Google">Google</SelectItem>
                      <SelectItem value="Yelp">Yelp</SelectItem>
                      <SelectItem value="Facebook">Facebook</SelectItem>
                    </SelectContent>
                  </Select>

                  {/* New Filter for AI Replies */}
                  <Select value={filters.hasReply} onValueChange={v => setFilters(f => ({ ...f, hasReply: v }))}>
                    <SelectTrigger className="w-full md:w-[160px] h-10 bg-white">
                      <SelectValue placeholder="AI Replies" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Reviews</SelectItem>
                      <SelectItem value="replied">Has AI Reply</SelectItem>
                      <SelectItem value="no_reply">No Reply Yet</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {/* Reviews List */}
            <div className="space-y-4">
              {displayedReviews.map(review => (
                <ReviewCard 
                  key={review.id} 
                  review={review}
                  business={businessMap.get(review.businessId)}
                  onImprove={handleImproveReview}
                  onReply={handleReplyToReview}
                  isProcessing={processingReviewId === review.id}
                  processingType={processingType}
                />
              ))}
            </div>

            {/* Load More */}
            {hasMore && (
              <div className="flex justify-center pt-4">
                <Button
                  onClick={() => setDisplayLimit(prev => prev + 5)}
                  variant="outline"
                  className="border-slate-300 hover:bg-slate-50"
                >
                  <ChevronDown className="w-4 h-4 mr-2" />
                  Load More Reviews
                </Button>
              </div>
            )}

            {/* Empty State */}
            {!isLoading && filteredReviews.length === 0 && (
              <Card className="bg-white/80 backdrop-blur-sm border-slate-200/60 shadow-sm">
                <CardContent className="py-12">
                  <div className="text-center">
                    <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-violet-100 to-purple-100 rounded-full flex items-center justify-center">
                      <MessageCircle className="w-8 h-8 text-violet-600" />
                    </div>
                    <h3 className="text-lg font-semibold text-slate-900 mb-2">No reviews found</h3>
                    <p className="text-slate-500 mb-4">
                      {reviews.length === 0 
                        ? "Click 'Generate Reviews' to create sample reviews" 
                        : "Try adjusting your search filters."}
                    </p>
                    {reviews.length === 0 && (
                      <Button
                        onClick={handleGenerateReviews}
                        className="bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700"
                      >
                        <Sparkles className="w-4 h-4 mr-2" />
                        Generate Sample Reviews
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Sidebar */}
          <div className="hidden lg:block space-y-6"> {/* Added space-y-6 for spacing between cards */}
            <GEOSuggestions businesses={businesses} />
            
            {/* Sentiment Breakdown */}
            <Card className="bg-white/80 backdrop-blur-sm border-slate-200/60 shadow-sm sticky top-[calc(100vh-400px)]">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <ThumbsUp className="w-4 h-4 text-green-600" />
                  Sentiment Breakdown
                </CardTitle>
              </CardHeader>
              <CardContent>
                <SentimentBreakdown reviews={reviews} />
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
