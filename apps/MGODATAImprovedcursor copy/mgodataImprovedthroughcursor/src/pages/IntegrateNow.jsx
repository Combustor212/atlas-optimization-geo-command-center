import React, { useState, useEffect } from 'react';
import { BusinessConnection, FAQ, Review } from '@/api/entities';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Globe,
  Link as LinkIcon,
  Sparkles,
  Check,
  AlertCircle,
  RefreshCw,
  Save,
  Upload,
  TrendingUp,
  Target,
  Brain,
  CheckCircle2,
  XCircle,
  Loader2,
  Plus,
  Trash2,
  Lightbulb
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

// ============================================================================
// PROGRESS BAR COMPONENT
// ============================================================================
const ProgressBar = ({ value, label, color = "purple" }) => {
  const colorClasses = {
    purple: "bg-purple-600",
    green: "bg-green-600",
    amber: "bg-amber-600",
    red: "bg-red-600"
  };

  return (
    <div className="space-y-2">
      <div className="flex justify-between text-sm">
        <span className="font-medium text-slate-700">{label}</span>
        <span className="font-bold text-slate-900">{value}%</span>
      </div>
      <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${value}%` }}
          transition={{ duration: 1, ease: "easeOut" }}
          className={cn("h-full rounded-full", colorClasses[color])}
        />
      </div>
    </div>
  );
};

// ============================================================================
// AI RECOMMENDATION CARD
// ============================================================================
const AIRecommendation = ({ recommendation, onApply }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="mt-3 p-4 bg-gradient-to-r from-purple-50 to-indigo-50 rounded-xl border-2 border-purple-200"
    >
      <div className="flex items-start gap-3">
        <div className="w-8 h-8 rounded-lg bg-purple-600 flex items-center justify-center flex-shrink-0">
          <Lightbulb className="w-4 h-4 text-white" />
        </div>
        <div className="flex-1">
          <h4 className="font-semibold text-purple-900 text-sm mb-1">AI Recommendation</h4>
          <p className="text-sm text-purple-800 leading-relaxed">{recommendation}</p>
          {onApply && (
            <Button
              onClick={onApply}
              size="sm"
              className="mt-3 bg-purple-600 hover:bg-purple-700 text-white"
            >
              <Sparkles className="w-3 h-3 mr-1" />
              Apply Suggestion
            </Button>
          )}
        </div>
      </div>
    </motion.div>
  );
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================
export default function IntegrateNow({ user }) {
  const queryClient = useQueryClient();
  const [isSyncing, setIsSyncing] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [enableAIEnhancement, setEnableAIEnhancement] = useState(false);
  
  // Business Connection State
  const [businessData, setBusinessData] = useState({
    businessName: '',
    websiteUrl: '',
    googleBusinessUrl: '',
    appleMapsUrl: '',
    yelpUrl: '',
    category: ''
  });

  // Fetch existing business connection
  const { data: connections, isLoading: connectionsLoading } = useQuery({
    queryKey: ['business-connections'],
    queryFn: async () => {
      const data = await BusinessConnection.filter({ isActive: true });
      return data || [];
    },
  });

  // Fetch FAQs
  const { data: faqs, isLoading: faqsLoading } = useQuery({
    queryKey: ['faqs-edit'],
    queryFn: async () => {
      const data = await FAQ.list('order', 100);
      return data || [];
    },
  });

  // Fetch Reviews
  const { data: reviews, isLoading: reviewsLoading } = useQuery({
    queryKey: ['reviews-edit'],
    queryFn: async () => {
      const data = await Review.list('order', 100);
      return data || [];
    },
  });

  const existingConnection = connections && connections.length > 0 ? connections[0] : null;
  const isSynced = !!existingConnection;

  // Load existing connection data
  useEffect(() => {
    if (existingConnection) {
      setBusinessData({
        businessName: existingConnection.businessName || '',
        websiteUrl: existingConnection.websiteUrl || '',
        googleBusinessUrl: existingConnection.googleBusinessUrl || '',
        appleMapsUrl: existingConnection.appleMapsUrl || '',
        yelpUrl: existingConnection.yelpUrl || '',
        category: existingConnection.category || ''
      });
    }
  }, [existingConnection]);

  // ============================================================================
  // SYNC BUSINESS
  // ============================================================================
  const handleSyncBusiness = async () => {
    if (!businessData.businessName) {
      toast.error("Please enter a business name");
      return;
    }

    setIsSyncing(true);

    try {
      // Simulate API call - replace with real endpoint later
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Create or update business connection
      const connectionData = {
        ...businessData,
        visibilityScore: Math.floor(Math.random() * 30) + 60, // 60-90
        missingKeywords: ['AI visibility', 'local search', 'near me'],
        aiCompatibility: 'Pass',
        promptReadiness: Math.floor(Math.random() * 20) + 70, // 70-90
        syncedAt: new Date().toISOString(),
        isActive: true
      };

      if (existingConnection) {
        await BusinessConnection.update(existingConnection.id, connectionData);
      } else {
        await BusinessConnection.create(connectionData);
      }

      queryClient.invalidateQueries({ queryKey: ['business-connections'] });
      toast.success("Business synced successfully!");

    } catch (error) {
      console.error('Sync error:', error);
      toast.error("Failed to sync business");
    } finally {
      setIsSyncing(false);
    }
  };

  // ============================================================================
  // PUBLISH ALL CHANGES
  // ============================================================================
  const handlePublishAll = async () => {
    setIsPublishing(true);

    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      toast.success("Content published to all platforms!");
    } catch (error) {
      console.error('Publish error:', error);
      toast.error("Failed to publish changes");
    } finally {
      setIsPublishing(false);
    }
  };

  // ============================================================================
  // FAQ MANAGEMENT
  // ============================================================================
  const [editingFaqs, setEditingFaqs] = useState([]);

  useEffect(() => {
    if (faqs) {
      setEditingFaqs(faqs.map(f => ({ ...f })));
    }
  }, [faqs]);

  const addFaq = () => {
    setEditingFaqs([...editingFaqs, {
      question: '',
      answer: '',
      keywords: [],
      order: editingFaqs.length,
      published: true
    }]);
  };

  const updateFaq = (index, field, value) => {
    const updated = [...editingFaqs];
    updated[index][field] = value;
    setEditingFaqs(updated);
  };

  const removeFaq = (index) => {
    setEditingFaqs(editingFaqs.filter((_, i) => i !== index));
  };

  const saveFaqs = async () => {
    try {
      // Delete existing FAQs
      if (faqs) {
        for (const faq of faqs) {
          await FAQ.delete(faq.id);
        }
      }

      // Create new FAQs
      for (const faq of editingFaqs) {
        if (faq.question && faq.answer) {
          const { id, ...faqData } = faq;
          await FAQ.create(faqData);
        }
      }

      queryClient.invalidateQueries({ queryKey: ['faqs-edit'] });
      toast.success("FAQs saved successfully!");
    } catch (error) {
      console.error('Save FAQs error:', error);
      toast.error("Failed to save FAQs");
    }
  };

  // ============================================================================
  // REVIEW MANAGEMENT
  // ============================================================================
  const [editingReviews, setEditingReviews] = useState([]);

  useEffect(() => {
    if (reviews) {
      setEditingReviews(reviews.map(r => ({ ...r })));
    }
  }, [reviews]);

  const addReview = () => {
    setEditingReviews([...editingReviews, {
      customerName: '',
      businessName: '',
      reviewText: '',
      rating: 5,
      keywords: [],
      order: editingReviews.length,
      published: true
    }]);
  };

  const updateReview = (index, field, value) => {
    const updated = [...editingReviews];
    updated[index][field] = value;
    setEditingReviews(updated);
  };

  const removeReview = (index) => {
    setEditingReviews(editingReviews.filter((_, i) => i !== index));
  };

  const saveReviews = async () => {
    try {
      // Delete existing reviews
      if (reviews) {
        for (const review of reviews) {
          await Review.delete(review.id);
        }
      }

      // Create new reviews
      for (const review of editingReviews) {
        if (review.customerName && review.reviewText) {
          const { id, ...reviewData } = review;
          await Review.create(reviewData);
        }
      }

      queryClient.invalidateQueries({ queryKey: ['reviews-edit'] });
      toast.success("Reviews saved successfully!");
    } catch (error) {
      console.error('Save reviews error:', error);
      toast.error("Failed to save reviews");
    }
  };

  // ============================================================================
  // AEO KEYWORDS
  // ============================================================================
  const [keywords, setKeywords] = useState(['AI SEO tools', 'mapping visibility', 'local AI ranking']);
  const [newKeyword, setNewKeyword] = useState('');

  const addKeyword = () => {
    if (newKeyword.trim() && !keywords.includes(newKeyword.trim())) {
      setKeywords([...keywords, newKeyword.trim()]);
      setNewKeyword('');
    }
  };

  const removeKeyword = (keyword) => {
    setKeywords(keywords.filter(k => k !== keyword));
  };

  const regenerateKeywords = async () => {
    toast.info("Generating AI keyword suggestions...");
    
    // Simulate AI generation
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    const suggestions = [
      'AI-powered local search',
      'voice search optimization',
      'Google Maps ranking',
      'local business visibility',
      'AEO optimization services'
    ];
    
    setKeywords([...new Set([...keywords, ...suggestions])]);
    toast.success("New keyword suggestions added!");
  };

  // ============================================================================
  // RENDER
  // ============================================================================
  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-purple-50/30 to-white">
      <div className="max-w-7xl mx-auto p-6 space-y-8">
        
        {/* Page Header */}
        <div className="text-center mb-12">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center justify-center gap-3 mb-4"
          >
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-purple-600 to-indigo-600 flex items-center justify-center">
              <Globe className="w-7 h-7 text-white" />
            </div>
            <h1 className="text-4xl font-bold text-slate-900">
              AEO Optimization Hub
            </h1>
          </motion.div>
          <p className="text-xl text-slate-600 max-w-2xl mx-auto">
            Connect your business, optimize content, and dominate AI-powered search
          </p>
        </div>

        {/* 1️⃣ BUSINESS INTEGRATION PANEL */}
        <Card className="border-0 shadow-xl bg-white/80 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-2xl">
              <LinkIcon className="w-6 h-6 text-purple-600" />
              Connect Your Business
            </CardTitle>
            <CardDescription>
              Sync your business profiles to start optimizing for AI visibility
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="businessName">Business Name *</Label>
                <Input
                  id="businessName"
                  value={businessData.businessName}
                  onChange={(e) => setBusinessData({ ...businessData, businessName: e.target.value })}
                  placeholder="Joe's Pizza"
                  className="h-12"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="websiteUrl">Website URL</Label>
                <Input
                  id="websiteUrl"
                  value={businessData.websiteUrl}
                  onChange={(e) => setBusinessData({ ...businessData, websiteUrl: e.target.value })}
                  placeholder="https://joespizza.com"
                  className="h-12"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="googleBusinessUrl">Google Business Profile Link</Label>
                <Input
                  id="googleBusinessUrl"
                  value={businessData.googleBusinessUrl}
                  onChange={(e) => setBusinessData({ ...businessData, googleBusinessUrl: e.target.value })}
                  placeholder="https://business.google.com/..."
                  className="h-12"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="appleMapsUrl">Apple Maps Link</Label>
                <Input
                  id="appleMapsUrl"
                  value={businessData.appleMapsUrl}
                  onChange={(e) => setBusinessData({ ...businessData, appleMapsUrl: e.target.value })}
                  placeholder="https://maps.apple.com/..."
                  className="h-12"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="yelpUrl">Yelp Profile Link</Label>
                <Input
                  id="yelpUrl"
                  value={businessData.yelpUrl}
                  onChange={(e) => setBusinessData({ ...businessData, yelpUrl: e.target.value })}
                  placeholder="https://yelp.com/biz/..."
                  className="h-12"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="category">Category / Industry</Label>
                <Select value={businessData.category} onValueChange={(value) => setBusinessData({ ...businessData, category: value })}>
                  <SelectTrigger className="h-12">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="restaurant">Restaurant</SelectItem>
                    <SelectItem value="retail">Retail</SelectItem>
                    <SelectItem value="services">Services</SelectItem>
                    <SelectItem value="healthcare">Healthcare</SelectItem>
                    <SelectItem value="automotive">Automotive</SelectItem>
                    <SelectItem value="real-estate">Real Estate</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Button
              onClick={handleSyncBusiness}
              disabled={isSyncing || !businessData.businessName}
              className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 h-12 text-base font-semibold"
            >
              {isSyncing ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Syncing Listings...
                </>
              ) : isSynced ? (
                <>
                  <RefreshCw className="w-5 h-5 mr-2" />
                  Re-Sync My Listings
                </>
              ) : (
                <>
                  <Globe className="w-5 h-5 mr-2" />
                  Sync My Listings
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* 2️⃣ AEO OPTIMIZATION SUMMARY */}
        {isSynced && existingConnection && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <Card className="border-0 shadow-xl bg-gradient-to-br from-purple-50 to-indigo-50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-2xl">
                  <Target className="w-6 h-6 text-purple-600" />
                  AEO Readiness Summary
                </CardTitle>
                <CardDescription>
                  Your current optimization status across AI search engines
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <ProgressBar
                      value={existingConnection.visibilityScore || 0}
                      label="Visibility Score"
                      color={existingConnection.visibilityScore >= 80 ? "green" : existingConnection.visibilityScore >= 60 ? "amber" : "red"}
                    />
                  </div>

                  <div>
                    <ProgressBar
                      value={existingConnection.promptReadiness || 0}
                      label="Prompt Readiness"
                      color={existingConnection.promptReadiness >= 80 ? "green" : existingConnection.promptReadiness >= 60 ? "amber" : "red"}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4">
                  <Card className="bg-white/80 border-2 border-purple-200">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-slate-600 mb-1">AI Compatibility</p>
                          <p className="text-2xl font-bold text-slate-900">{existingConnection.aiCompatibility}</p>
                        </div>
                        {existingConnection.aiCompatibility === 'Pass' ? (
                          <CheckCircle2 className="w-10 h-10 text-green-500" />
                        ) : (
                          <XCircle className="w-10 h-10 text-red-500" />
                        )}
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="bg-white/80 border-2 border-amber-200">
                    <CardContent className="p-4">
                      <div>
                        <p className="text-sm text-slate-600 mb-2">Missing Keywords</p>
                        <div className="flex flex-wrap gap-2">
                          {existingConnection.missingKeywords && existingConnection.missingKeywords.map((keyword, idx) => (
                            <Badge key={idx} variant="outline" className="bg-amber-50 text-amber-700 border-amber-300">
                              {keyword}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* 3️⃣ FAQ OPTIMIZATION SECTION */}
        {isSynced && (
          <Card className="border-0 shadow-xl bg-white/80 backdrop-blur-sm">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2 text-2xl">
                    <Brain className="w-6 h-6 text-purple-600" />
                    FAQ Optimization
                  </CardTitle>
                  <CardDescription>
                    Optimize your FAQs for AI voice search and answer engines
                  </CardDescription>
                </div>
                <Button onClick={addFaq} variant="outline" className="border-purple-300 hover:bg-purple-50">
                  <Plus className="w-4 h-4 mr-2" />
                  Add FAQ
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {faqsLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
                </div>
              ) : (
                <>
                  <AnimatePresence>
                    {editingFaqs.map((faq, index) => (
                      <motion.div
                        key={index}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, x: -100 }}
                        className="p-6 bg-slate-50 rounded-xl border-2 border-slate-200 space-y-4"
                      >
                        <div className="flex items-start justify-between">
                          <h4 className="font-semibold text-slate-900">FAQ #{index + 1}</h4>
                          <Button
                            onClick={() => removeFaq(index)}
                            variant="ghost"
                            size="sm"
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>

                        <div className="space-y-4">
                          <div>
                            <Label htmlFor={`faq-question-${index}`}>Question</Label>
                            <Input
                              id={`faq-question-${index}`}
                              value={faq.question}
                              onChange={(e) => updateFaq(index, 'question', e.target.value)}
                              placeholder="What services do you offer?"
                              className="mt-2"
                            />
                          </div>

                          <div>
                            <Label htmlFor={`faq-answer-${index}`}>Answer</Label>
                            <Textarea
                              id={`faq-answer-${index}`}
                              value={faq.answer}
                              onChange={(e) => updateFaq(index, 'answer', e.target.value)}
                              placeholder="We offer comprehensive AI-powered visibility optimization..."
                              rows={4}
                              className="mt-2"
                            />
                          </div>

                          <div>
                            <Label>Suggested AEO Keywords</Label>
                            <div className="flex flex-wrap gap-2 mt-2">
                              {(faq.keywords || []).map((keyword, kIdx) => (
                                <Badge key={kIdx} className="bg-purple-100 text-purple-700">
                                  {keyword}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        </div>

                        <AIRecommendation
                          recommendation={`Include keywords like "best ${businessData.category} near me" or "AI-powered ${businessData.category} solutions" to improve AEO visibility. Add location-specific terms for better local AI search results.`}
                        />
                      </motion.div>
                    ))}
                  </AnimatePresence>

                  {editingFaqs.length === 0 && (
                    <div className="text-center py-12">
                      <Brain className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                      <p className="text-slate-500 mb-4">No FAQs yet. Add your first one to boost AI visibility.</p>
                      <Button onClick={addFaq} className="bg-purple-600 hover:bg-purple-700">
                        <Plus className="w-4 h-4 mr-2" />
                        Add First FAQ
                      </Button>
                    </div>
                  )}

                  {editingFaqs.length > 0 && (
                    <Button
                      onClick={saveFaqs}
                      className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 h-12"
                    >
                      <Save className="w-5 h-5 mr-2" />
                      Save All FAQs
                    </Button>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        )}

        {/* 4️⃣ REVIEW OPTIMIZATION SECTION */}
        {isSynced && (
          <Card className="border-0 shadow-xl bg-white/80 backdrop-blur-sm">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2 text-2xl">
                    <Sparkles className="w-6 h-6 text-purple-600" />
                    Review Optimization
                  </CardTitle>
                  <CardDescription>
                    Showcase customer testimonials optimized for AI discovery
                  </CardDescription>
                </div>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={enableAIEnhancement}
                      onCheckedChange={setEnableAIEnhancement}
                      id="ai-enhancement"
                    />
                    <Label htmlFor="ai-enhancement" className="text-sm font-medium cursor-pointer">
                      AI Enhancement
                    </Label>
                  </div>
                  <Button onClick={addReview} variant="outline" className="border-purple-300 hover:bg-purple-50">
                    <Plus className="w-4 h-4 mr-2" />
                    Add Review
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {reviewsLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
                </div>
              ) : (
                <>
                  <AnimatePresence>
                    {editingReviews.map((review, index) => (
                      <motion.div
                        key={index}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, x: -100 }}
                        className="p-6 bg-slate-50 rounded-xl border-2 border-slate-200 space-y-4"
                      >
                        <div className="flex items-start justify-between">
                          <h4 className="font-semibold text-slate-900">Review #{index + 1}</h4>
                          <Button
                            onClick={() => removeReview(index)}
                            variant="ghost"
                            size="sm"
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <Label htmlFor={`review-name-${index}`}>Customer Name</Label>
                            <Input
                              id={`review-name-${index}`}
                              value={review.customerName}
                              onChange={(e) => updateReview(index, 'customerName', e.target.value)}
                              placeholder="John Doe"
                              className="mt-2"
                            />
                          </div>

                          <div>
                            <Label htmlFor={`review-rating-${index}`}>Star Rating</Label>
                            <Select
                              value={review.rating?.toString()}
                              onValueChange={(value) => updateReview(index, 'rating', parseInt(value))}
                            >
                              <SelectTrigger className="mt-2">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {[5, 4, 3, 2, 1].map(rating => (
                                  <SelectItem key={rating} value={rating.toString()}>
                                    {'⭐'.repeat(rating)} ({rating} stars)
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>

                        <div>
                          <Label htmlFor={`review-text-${index}`}>Review Text</Label>
                          <Textarea
                            id={`review-text-${index}`}
                            value={review.reviewText}
                            onChange={(e) => updateReview(index, 'reviewText', e.target.value)}
                            placeholder="Amazing service! They helped us rank #1 on Google Maps..."
                            rows={4}
                            className="mt-2"
                          />
                        </div>

                        {enableAIEnhancement && (
                          <AIRecommendation
                            recommendation="Add mentions of speed, service quality, or AI accuracy — these help trigger voice and AI search results. Include specific outcomes like 'increased calls by 40%' for better credibility."
                          />
                        )}
                      </motion.div>
                    ))}
                  </AnimatePresence>

                  {editingReviews.length === 0 && (
                    <div className="text-center py-12">
                      <Sparkles className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                      <p className="text-slate-500 mb-4">No reviews yet. Add testimonials to build trust.</p>
                      <Button onClick={addReview} className="bg-purple-600 hover:bg-purple-700">
                        <Plus className="w-4 h-4 mr-2" />
                        Add First Review
                      </Button>
                    </div>
                  )}

                  {editingReviews.length > 0 && (
                    <Button
                      onClick={saveReviews}
                      className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 h-12"
                    >
                      <Save className="w-5 h-5 mr-2" />
                      Save All Reviews
                    </Button>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        )}

        {/* 5️⃣ AEO KEYWORD OPTIMIZER */}
        {isSynced && (
          <Card className="border-0 shadow-xl bg-white/80 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-2xl">
                <TrendingUp className="w-6 h-6 text-purple-600" />
                AEO Keyword Optimizer
              </CardTitle>
              <CardDescription>
                Optimize your content with AI-powered keyword suggestions
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex flex-wrap gap-2 p-4 bg-slate-50 rounded-xl border-2 border-slate-200 min-h-[100px]">
                {keywords.map((keyword, index) => (
                  <Badge
                    key={index}
                    className="bg-purple-600 text-white px-3 py-1.5 text-sm cursor-pointer hover:bg-purple-700"
                    onClick={() => removeKeyword(keyword)}
                  >
                    {keyword} ×
                  </Badge>
                ))}
              </div>

              <div className="flex gap-3">
                <Input
                  value={newKeyword}
                  onChange={(e) => setNewKeyword(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && addKeyword()}
                  placeholder="Add custom keyword..."
                  className="h-12"
                />
                <Button onClick={addKeyword} variant="outline" className="h-12 px-6">
                  <Plus className="w-5 h-5" />
                </Button>
              </div>

              <AIRecommendation
                recommendation="Based on your industry, add keywords like: 'AI SEO tools', 'mapping visibility', 'local AI ranking', 'voice search optimization', and 'near me services'. These terms improve your discoverability in AI-powered searches."
              />

              <Button
                onClick={regenerateKeywords}
                className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 h-12"
              >
                <Sparkles className="w-5 h-5 mr-2" />
                Regenerate AI Suggestions
              </Button>
            </CardContent>
          </Card>
        )}

        {/* 6️⃣ PUBLISH / SAVE SECTION */}
        {isSynced && (
          <Card className="border-0 shadow-xl bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-200">
            <CardContent className="p-8">
              <div className="text-center space-y-6">
                <div>
                  <h3 className="text-2xl font-bold text-slate-900 mb-2">
                    Ready to Publish?
                  </h3>
                  <p className="text-slate-600">
                    Your optimized content will be synced to Google, Apple, and AI search engines
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl mx-auto">
                  <Button
                    variant="outline"
                    className="h-14 text-base font-semibold border-2 border-slate-300 hover:bg-slate-50"
                  >
                    <Save className="w-5 h-5 mr-2" />
                    Save Draft
                  </Button>

                  <Button
                    onClick={handlePublishAll}
                    disabled={isPublishing}
                    className="h-14 text-base font-semibold bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 shadow-lg hover:shadow-xl"
                  >
                    {isPublishing ? (
                      <>
                        <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                        Publishing...
                      </>
                    ) : (
                      <>
                        <Upload className="w-5 h-5 mr-2" />
                        Publish to All Platforms
                      </>
                    )}
                  </Button>
                </div>

                <p className="text-sm text-slate-500">
                  Changes typically appear within 24-48 hours across all platforms
                </p>
              </div>
            </CardContent>
          </Card>
        )}

      </div>
    </div>
  );
}