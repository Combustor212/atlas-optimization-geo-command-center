import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Plus, Trash2, Save, FileText, MessageSquare, Settings, Star } from 'lucide-react';
import { FAQ, Review, SEOSettings } from '@/api/entities';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { motion } from 'framer-motion';

export default function ContentManager() {
  const [activeTab, setActiveTab] = useState('faqs');
  const queryClient = useQueryClient();

  // FAQ Management
  const { data: faqs } = useQuery({
    queryKey: ['faqs'],
    queryFn: () => FAQ.list('-order'),
  });

  const { data: reviews } = useQuery({
    queryKey: ['reviews'],
    queryFn: () => Review.list('-order'),
  });

  const { data: seoSettings } = useQuery({
    queryKey: ['seo-settings'],
    queryFn: () => SEOSettings.list(),
  });

  const createFAQMutation = useMutation({
    mutationFn: (data) => FAQ.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['faqs'] });
      toast.success('FAQ created successfully');
    },
  });

  const createReviewMutation = useMutation({
    mutationFn: (data) => Review.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reviews'] });
      toast.success('Review created successfully');
    },
  });

  const createSEOMutation = useMutation({
    mutationFn: (data) => SEOSettings.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['seo-settings'] });
      toast.success('SEO settings created successfully');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: ({ entity, id }) => {
      const entityMap = { FAQ, Review, SEOSettings };
      return entityMap[entity].delete(id);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [variables.entity.toLowerCase() + 's'] });
      toast.success('Item deleted successfully');
    },
  });

  const tabs = [
    { id: 'faqs', label: 'FAQs', icon: FileText },
    { id: 'reviews', label: 'Reviews', icon: MessageSquare },
    { id: 'seo', label: 'SEO Settings', icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-purple-50/20 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-slate-900 mb-2">
            Content Management System
          </h1>
          <p className="text-slate-600">
            Manage FAQs, Reviews, and SEO settings for AEO optimization
          </p>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 border-b border-slate-200">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-6 py-3 font-medium transition-all relative ${
                  activeTab === tab.id
                    ? 'text-purple-600'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Icon className="w-4 h-4" />
                  <span>{tab.label}</span>
                </div>
                {activeTab === tab.id && (
                  <motion.div
                    layoutId="activeTab"
                    className="absolute bottom-0 left-0 right-0 h-0.5 bg-purple-600"
                  />
                )}
              </button>
            );
          })}
        </div>

        {/* Content */}
        {activeTab === 'faqs' && (
          <FAQManager
            faqs={faqs}
            onCreate={createFAQMutation.mutate}
            onDelete={(id) => deleteMutation.mutate({ entity: 'FAQ', id })}
          />
        )}

        {activeTab === 'reviews' && (
          <ReviewManager
            reviews={reviews}
            onCreate={createReviewMutation.mutate}
            onDelete={(id) => deleteMutation.mutate({ entity: 'Review', id })}
          />
        )}

        {activeTab === 'seo' && (
          <SEOManager
            settings={seoSettings}
            onCreate={createSEOMutation.mutate}
            onDelete={(id) => deleteMutation.mutate({ entity: 'SEOSettings', id })}
          />
        )}
      </div>
    </div>
  );
}

// FAQ Manager Component
function FAQManager({ faqs, onCreate, onDelete }) {
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    question: '',
    answer: '',
    keywords: [],
    order: 0,
    published: true,
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onCreate(formData);
    setFormData({ question: '', answer: '', keywords: [], order: 0, published: true });
    setShowForm(false);
  };

  return (
    <div className="space-y-6">
      <Button
        onClick={() => setShowForm(!showForm)}
        className="bg-purple-600 hover:bg-purple-700"
      >
        <Plus className="w-4 h-4 mr-2" />
        Add New FAQ
      </Button>

      {showForm && (
        <Card className="border-purple-200">
          <CardHeader>
            <CardTitle>New FAQ</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="question">Question *</Label>
                <Input
                  id="question"
                  value={formData.question}
                  onChange={(e) => setFormData({ ...formData, question: e.target.value })}
                  required
                  placeholder="What is AI visibility optimization?"
                />
              </div>

              <div>
                <Label htmlFor="answer">Answer *</Label>
                <Textarea
                  id="answer"
                  value={formData.answer}
                  onChange={(e) => setFormData({ ...formData, answer: e.target.value })}
                  required
                  rows={4}
                  placeholder="AI visibility optimization helps businesses..."
                />
              </div>

              <div>
                <Label htmlFor="keywords">AEO Keywords (comma-separated)</Label>
                <Input
                  id="keywords"
                  value={formData.keywords.join(', ')}
                  onChange={(e) =>
                    setFormData({ ...formData, keywords: e.target.value.split(',').map((k) => k.trim()) })
                  }
                  placeholder="AI visibility, local SEO, Google Maps"
                />
              </div>

              <div className="flex items-center gap-2">
                <Switch
                  id="published"
                  checked={formData.published}
                  onCheckedChange={(checked) => setFormData({ ...formData, published: checked })}
                />
                <Label htmlFor="published">Published</Label>
              </div>

              <div className="flex gap-2">
                <Button type="submit" className="bg-purple-600 hover:bg-purple-700">
                  <Save className="w-4 h-4 mr-2" />
                  Save FAQ
                </Button>
                <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* FAQ List */}
      <div className="grid gap-4">
        {faqs?.map((faq) => (
          <Card key={faq.id} className="hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="font-semibold text-lg text-slate-900 mb-2">{faq.question}</h3>
                  <p className="text-slate-600 text-sm mb-3">{faq.answer}</p>
                  {faq.keywords && faq.keywords.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {faq.keywords.map((keyword, i) => (
                        <span
                          key={i}
                          className="px-2 py-1 bg-purple-50 text-purple-600 text-xs rounded-full"
                        >
                          {keyword}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onDelete(faq.id)}
                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

// Review Manager Component
function ReviewManager({ reviews, onCreate, onDelete }) {
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    customerName: '',
    businessName: '',
    reviewText: '',
    rating: 5,
    keywords: [],
    order: 0,
    published: true,
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onCreate(formData);
    setFormData({
      customerName: '',
      businessName: '',
      reviewText: '',
      rating: 5,
      keywords: [],
      order: 0,
      published: true,
    });
    setShowForm(false);
  };

  return (
    <div className="space-y-6">
      <Button
        onClick={() => setShowForm(!showForm)}
        className="bg-purple-600 hover:bg-purple-700"
      >
        <Plus className="w-4 h-4 mr-2" />
        Add New Review
      </Button>

      {showForm && (
        <Card className="border-purple-200">
          <CardHeader>
            <CardTitle>New Review</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="customerName">Customer Name *</Label>
                  <Input
                    id="customerName"
                    value={formData.customerName}
                    onChange={(e) => setFormData({ ...formData, customerName: e.target.value })}
                    required
                    placeholder="John Doe"
                  />
                </div>

                <div>
                  <Label htmlFor="businessName">Business Name</Label>
                  <Input
                    id="businessName"
                    value={formData.businessName}
                    onChange={(e) => setFormData({ ...formData, businessName: e.target.value })}
                    placeholder="ABC Restaurant"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="reviewText">Review Text *</Label>
                <Textarea
                  id="reviewText"
                  value={formData.reviewText}
                  onChange={(e) => setFormData({ ...formData, reviewText: e.target.value })}
                  required
                  rows={4}
                  placeholder="AGS helped us..."
                />
              </div>

              <div>
                <Label htmlFor="rating">Star Rating *</Label>
                <Input
                  id="rating"
                  type="number"
                  min="1"
                  max="5"
                  value={formData.rating}
                  onChange={(e) => setFormData({ ...formData, rating: parseInt(e.target.value) })}
                  required
                />
              </div>

              <div>
                <Label htmlFor="keywords">Keywords (comma-separated)</Label>
                <Input
                  id="keywords"
                  value={formData.keywords.join(', ')}
                  onChange={(e) =>
                    setFormData({ ...formData, keywords: e.target.value.split(',').map((k) => k.trim()) })
                  }
                  placeholder="AI visibility, Google Maps rank"
                />
              </div>

              <div className="flex items-center gap-2">
                <Switch
                  id="published"
                  checked={formData.published}
                  onCheckedChange={(checked) => setFormData({ ...formData, published: checked })}
                />
                <Label htmlFor="published">Published</Label>
              </div>

              <div className="flex gap-2">
                <Button type="submit" className="bg-purple-600 hover:bg-purple-700">
                  <Save className="w-4 h-4 mr-2" />
                  Save Review
                </Button>
                <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Review List */}
      <div className="grid gap-4">
        {reviews?.map((review) => (
          <Card key={review.id} className="hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-3">
                    <img
                      src={review.avatarUrl || `https://avatar.vercel.sh/${review.customerName}.png`}
                      alt={review.customerName}
                      className="w-12 h-12 rounded-full"
                    />
                    <div>
                      <p className="font-semibold text-slate-900">{review.customerName}</p>
                      {review.businessName && (
                        <p className="text-sm text-slate-500">{review.businessName}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 mb-2">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className={cn("w-4 h-4", i < review.rating ? 'text-yellow-400 fill-yellow-400' : 'text-slate-300')} />
                    ))}
                  </div>
                  <p className="text-slate-600 text-sm mb-3 italic">"{review.reviewText}"</p>
                  {review.keywords && review.keywords.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {review.keywords.map((keyword, i) => (
                        <span
                          key={i}
                          className="px-2 py-1 bg-purple-50 text-purple-600 text-xs rounded-full"
                        >
                          {keyword}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onDelete(review.id)}
                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

// SEO Manager Component
function SEOManager({ settings, onCreate, onDelete }) {
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    pageName: '',
    pageTitle: '',
    metaDescription: '',
    keywords: [],
    indexPage: true,
    ogTitle: '',
    ogDescription: '',
    ogImage: '',
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onCreate(formData);
    setFormData({
      pageName: '',
      pageTitle: '',
      metaDescription: '',
      keywords: [],
      indexPage: true,
      ogTitle: '',
      ogDescription: '',
      ogImage: '',
    });
    setShowForm(false);
  };

  return (
    <div className="space-y-6">
      <Button
        onClick={() => setShowForm(!showForm)}
        className="bg-purple-600 hover:bg-purple-700"
      >
        <Plus className="w-4 h-4 mr-2" />
        Add SEO Settings
      </Button>

      {showForm && (
        <Card className="border-purple-200">
          <CardHeader>
            <CardTitle>New SEO Settings</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="pageName">Page Name *</Label>
                <Input
                  id="pageName"
                  value={formData.pageName}
                  onChange={(e) => setFormData({ ...formData, pageName: e.target.value })}
                  required
                  placeholder="landing, pricing, etc."
                />
              </div>

              <div>
                <Label htmlFor="pageTitle">Page Title *</Label>
                <Input
                  id="pageTitle"
                  value={formData.pageTitle}
                  onChange={(e) => setFormData({ ...formData, pageTitle: e.target.value })}
                  required
                  placeholder="AI-Powered Local Visibility Scanner | AGS"
                />
              </div>

              <div>
                <Label htmlFor="metaDescription">Meta Description *</Label>
                <Textarea
                  id="metaDescription"
                  value={formData.metaDescription}
                  onChange={(e) => setFormData({ ...formData, metaDescription: e.target.value })}
                  required
                  rows={3}
                  placeholder="Boost your local business visibility..."
                />
              </div>

              <div>
                <Label htmlFor="keywords">AEO Keywords (comma-separated)</Label>
                <Input
                  id="keywords"
                  value={formData.keywords.join(', ')}
                  onChange={(e) =>
                    setFormData({ ...formData, keywords: e.target.value.split(',').map((k) => k.trim()) })
                  }
                  placeholder="local SEO, AI visibility, Google Maps optimization"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="ogTitle">Open Graph Title</Label>
                  <Input
                    id="ogTitle"
                    value={formData.ogTitle}
                    onChange={(e) => setFormData({ ...formData, ogTitle: e.target.value })}
                    placeholder="Same as page title"
                  />
                </div>

                <div>
                  <Label htmlFor="ogImage">Open Graph Image URL</Label>
                  <Input
                    id="ogImage"
                    value={formData.ogImage}
                    onChange={(e) => setFormData({ ...formData, ogImage: e.target.value })}
                    placeholder="https://..."
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="ogDescription">Open Graph Description</Label>
                <Textarea
                  id="ogDescription"
                  value={formData.ogDescription}
                  onChange={(e) => setFormData({ ...formData, ogDescription: e.target.value })}
                  rows={2}
                  placeholder="Same as meta description"
                />
              </div>

              <div className="flex items-center gap-2">
                <Switch
                  id="indexPage"
                  checked={formData.indexPage}
                  onCheckedChange={(checked) => setFormData({ ...formData, indexPage: checked })}
                />
                <Label htmlFor="indexPage">Allow Search Indexing</Label>
              </div>

              <div className="flex gap-2">
                <Button type="submit" className="bg-purple-600 hover:bg-purple-700">
                  <Save className="w-4 h-4 mr-2" />
                  Save Settings
                </Button>
                <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Settings List */}
      <div className="grid gap-4">
        {settings?.map((setting) => (
          <Card key={setting.id} className="hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="font-semibold text-lg text-slate-900">{setting.pageName}</h3>
                    {!setting.indexPage && (
                      <span className="px-2 py-1 bg-red-50 text-red-600 text-xs rounded-full">
                        No Index
                      </span>
                    )}
                  </div>
                  <p className="text-slate-900 font-medium mb-1">{setting.pageTitle}</p>
                  <p className="text-slate-600 text-sm mb-3">{setting.metaDescription}</p>
                  {setting.keywords && setting.keywords.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {setting.keywords.map((keyword, i) => (
                        <span
                          key={i}
                          className="px-2 py-1 bg-purple-50 text-purple-600 text-xs rounded-full"
                        >
                          {keyword}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onDelete(setting.id)}
                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}