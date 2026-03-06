import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { 
  Brain, 
  Sparkles, 
  FileText, 
  HelpCircle, 
  MessageSquare, 
  Send, 
  Copy, 
  Megaphone,
  Loader2,
  X,
  TrendingUp
} from 'lucide-react';
import { cn } from '@/lib/utils';

// Input Card Component
const InputCard = ({ icon: Icon, title, description, color, children }) => {
  return (
    <Card className="bg-white border-slate-200 shadow-md">
      <CardHeader className="pb-4">
        <div className="flex items-center gap-3 mb-2">
          <div className={cn(
            "w-12 h-12 rounded-xl bg-gradient-to-br flex items-center justify-center shadow-md",
            color === 'violet' ? 'from-violet-500 to-purple-500' :
            color === 'green' ? 'from-green-500 to-emerald-500' :
            color === 'blue' ? 'from-blue-500 to-cyan-500' :
            'from-orange-500 to-amber-500'
          )}>
            <Icon className="w-6 h-6 text-white" />
          </div>
          <div className="flex-1">
            <CardTitle className="text-lg font-bold text-slate-900">{title}</CardTitle>
            {description && <p className="text-sm text-slate-500 mt-1">{description}</p>}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        {children}
      </CardContent>
    </Card>
  );
};

export default function BusinessAssistant() {
  const [activeTab, setActiveTab] = useState('ask-ai');
  const [question, setQuestion] = useState('');
  const [niche, setNiche] = useState('');
  const [city, setCity] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [history, setHistory] = useState([]);

  const loadHistory = useCallback(async () => {
    try {
      const { BusinessAssistantResponse } = await import('@/api/entities');
      const toolMap = {
        'ask-ai': 'ask_ai',
        'blog-draft': 'blog_generator',
        'faq': 'faq_generator',
        'gbp-posts': 'gbp_posts'
      };
      const responses = await BusinessAssistantResponse.filter({ tool: toolMap[activeTab] }, '-created_date', 10);
      setHistory(responses || []);
    } catch (err) {
      console.error('Error loading history:', err);
      setHistory([]);
    }
  }, [activeTab]);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  const callOpenAI = async (prompt, systemRole, responseFormat = null) => {
    try {
      const { openaiChat } = await import('@/api/functions');
      const data = await openaiChat({
        prompt,
        system_role: systemRole,
        max_tokens: 1500,
        temperature: 0.7,
        response_format: responseFormat
      });

      if (data.error || !data.success) {
        throw new Error(data.error || 'AI service unavailable');
      }

      return data;
    } catch (err) {
      throw err;
    }
  };

  const saveResponse = async (tool, input, output, tokensUsed) => {
    try {
      const { BusinessAssistantResponse } = await import('@/api/entities');
      await BusinessAssistantResponse.create({
        tool,
        input,
        output,
        tokens_used: tokensUsed
      });
      loadHistory();
    } catch (err) {
      console.error('Error saving response:', err);
    }
  };

  const handleAskAI = async () => {
    if (!question || question.trim().length < 5) {
      setError('Please enter a valid question (at least 5 characters)');
      return;
    }

    setIsGenerating(true);
    setError(null);
    setResult(null);

    try {
      const prompt = `You are a smart business assistant. Answer the following question clearly, helpfully, and professionally:\n\n${question}`;
      const systemRole = 'You are an expert business consultant specializing in local service businesses, SEO, and digital marketing.';

      const data = await callOpenAI(prompt, systemRole);

      setResult({
        type: 'ask_ai',
        content: data.answer
      });

      await saveResponse('ask_ai', { question }, data.answer, data.tokens_used);

    } catch (err) {
      setError(err.message || 'Failed to generate response');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleGenerateBlog = async () => {
    if (!niche || !city) {
      setError('Please enter both business type and city');
      return;
    }

    setIsGenerating(true);
    setError(null);
    setResult(null);

    try {
      const prompt = `Write a detailed SEO-optimized blog post (500-700 words) for a ${niche} business in ${city}. 

Requirements:
- Include relevant headings (H2, H3)
- Use local keywords naturally (e.g., "${niche} in ${city}")
- Add 2-3 actionable tips or insights
- End with a strong call-to-action
- Make it engaging and valuable for local customers

Format as:
Title: [Catchy SEO-optimized title]

[Introduction paragraph]

## [Heading 1]
[Content]

## [Heading 2]
[Content]

## [Heading 3]
[Content]

[Conclusion with CTA]`;

      const systemRole = 'You are an expert SEO content writer specializing in local business blogs that rank well and convert visitors.';

      const data = await callOpenAI(prompt, systemRole);

      setResult({
        type: 'blog',
        content: data.answer
      });

      await saveResponse('blog_generator', { niche, city }, data.answer, data.tokens_used);

    } catch (err) {
      setError(err.message || 'Failed to generate blog post');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleGenerateFAQ = async () => {
    if (!niche || !city) {
      setError('Please enter both business type and city');
      return;
    }

    setIsGenerating(true);
    setError(null);
    setResult(null);

    try {
      const prompt = `Generate 7 frequently asked questions and detailed answers for a ${niche} business in ${city}. 

Requirements:
- Questions should be realistic and commonly asked by customers
- Answers should be helpful, accurate, and include local keywords
- Keep answers between 50-100 words
- Focus on addressing customer concerns and building trust

Format as JSON:
{
  "faqs": [
    {"question": "...", "answer": "..."},
    ...
  ]
}`;

      const systemRole = 'You are an expert at creating helpful FAQ content that builds trust and improves SEO for local businesses.';

      const data = await callOpenAI(prompt, systemRole, 'json_object');

      let faqs;
      try {
        const parsed = JSON.parse(data.answer);
        faqs = parsed.faqs || [];
      } catch {
        faqs = [];
      }

      setResult({
        type: 'faq',
        content: data.answer,
        faqs
      });

      await saveResponse('faq_generator', { niche, city }, data.answer, data.tokens_used);

    } catch (err) {
      setError(err.message || 'Failed to generate FAQs');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleGenerateGBPPosts = async () => {
    if (!niche || !city) {
      setError('Please enter both business type and city');
      return;
    }

    setIsGenerating(true);
    setError(null);
    setResult(null);

    try {
      const prompt = `Write 3 Google Business Profile posts for a ${niche} business in ${city}.

Requirements for each post:
- Under 150 words
- Conversational and engaging tone
- Include local keywords naturally
- Mix promotional and informational content
- End with a clear call-to-action

Format as JSON:
{
  "posts": [
    {"title": "...", "content": "...", "cta": "..."},
    {"title": "...", "content": "...", "cta": "..."},
    {"title": "...", "content": "...", "cta": "..."}
  ]
}`;

      const systemRole = 'You are an expert at creating engaging Google Business Profile posts that drive local engagement and conversions.';

      const data = await callOpenAI(prompt, systemRole, 'json_object');

      let posts;
      try {
        const parsed = JSON.parse(data.answer);
        posts = parsed.posts || [];
      } catch {
        posts = [];
      }

      setResult({
        type: 'gbp_posts',
        content: data.answer,
        posts
      });

      await saveResponse('gbp_posts', { niche, city }, data.answer, data.tokens_used);

    } catch (err) {
      setError(err.message || 'Failed to generate GBP posts');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    if (window.lgb?.track) {
      window.lgb.track('business_assistant_copy', { tool: activeTab });
    }
  };

  const tabs = [
    { id: 'ask-ai', label: 'Ask AI', icon: MessageSquare, description: 'Get instant answers', color: 'violet' },
    { id: 'blog-draft', label: 'Blog Generator', icon: FileText, description: 'Create SEO content', color: 'green' },
    { id: 'faq', label: 'FAQ Generator', icon: HelpCircle, description: 'Build trust pages', color: 'blue' },
    { id: 'gbp-posts', label: 'GBP Posts', icon: Megaphone, description: 'Social content', color: 'orange' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-50 via-white to-purple-50/30">
      <div className="max-w-7xl mx-auto px-6 py-8 space-y-8">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-600 to-purple-600 shadow-lg mb-4">
            <Brain className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-4xl font-bold text-slate-900 mb-3">
            Business Assistant
          </h1>
          <p className="text-lg text-slate-600 max-w-2xl mx-auto">
            Smart AI tools to grow your local business online
          </p>
        </div>

        {/* Tab Navigation */}
        <div className="bg-white rounded-2xl shadow-md border border-slate-200 p-2">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
            {tabs.map(tab => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => {
                    setActiveTab(tab.id);
                    setResult(null);
                    setError(null);
                  }}
                  className={cn(
                    "flex flex-col items-center gap-2 p-4 rounded-xl transition-all duration-200",
                    isActive 
                      ? `bg-gradient-to-br ${
                          tab.color === 'violet' ? 'from-violet-500 to-purple-500' :
                          tab.color === 'green' ? 'from-green-500 to-emerald-500' :
                          tab.color === 'blue' ? 'from-blue-500 to-cyan-500' :
                          'from-orange-500 to-amber-500'
                        } text-white shadow-lg scale-105` 
                      : "bg-white hover:bg-slate-50 text-slate-700 border border-slate-100"
                  )}
                >
                  <Icon className={cn("w-6 h-6", isActive ? "text-white" : `text-${tab.color}-600`)} />
                  <div className="text-center">
                    <p className={cn("font-bold text-sm", isActive ? "text-white" : "text-slate-900")}>
                      {tab.label}
                    </p>
                    <p className={cn("text-xs mt-0.5", isActive ? "text-white/90" : "text-slate-500")}>
                      {tab.description}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Tab Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content (2 columns) */}
          <div className="lg:col-span-2 space-y-6">
            {/* Input Section */}
            {activeTab === 'ask-ai' && (
              <InputCard
                icon={MessageSquare}
                title="Ask Your Business Question"
                description="Get AI-powered answers instantly"
                color="violet"
              >
                <Textarea
                  placeholder="E.g., 'What social media posts should I run for a plumbing business in Cincinnati?'"
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  rows={6}
                  className="bg-slate-50 border-slate-200 focus:border-violet-400 focus:ring-violet-400 text-base"
                />
                <Button 
                  onClick={handleAskAI} 
                  disabled={isGenerating}
                  className="w-full h-14 text-base bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 shadow-md hover:shadow-lg"
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      Thinking...
                    </>
                  ) : (
                    <>
                      <Send className="w-5 h-5 mr-2" />
                      Ask AI
                    </>
                  )}
                </Button>
              </InputCard>
            )}

            {(activeTab === 'blog-draft' || activeTab === 'faq' || activeTab === 'gbp-posts') && (
              <InputCard
                icon={
                  activeTab === 'blog-draft' ? FileText :
                  activeTab === 'faq' ? HelpCircle :
                  Megaphone
                }
                title={
                  activeTab === 'blog-draft' ? 'Generate Local Blog Post' :
                  activeTab === 'faq' ? 'Generate FAQs' :
                  'Generate GBP Posts'
                }
                description={
                  activeTab === 'blog-draft' ? 'SEO-optimized content for your business' :
                  activeTab === 'faq' ? 'Build trust with common questions answered' :
                  'Ready-to-publish Google Business Profile posts'
                }
                color={
                  activeTab === 'blog-draft' ? 'green' :
                  activeTab === 'faq' ? 'blue' :
                  'orange'
                }
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-semibold text-slate-700 mb-2 block">Business Type / Niche</label>
                    <Input
                      value={niche}
                      onChange={(e) => setNiche(e.target.value)}
                      placeholder="e.g., Plumbing"
                      className="bg-slate-50 border-slate-200 focus:border-violet-400 focus:ring-violet-400 h-12 text-base"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-semibold text-slate-700 mb-2 block">City</label>
                    <Input
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      placeholder="e.g., Cincinnati"
                      className="bg-slate-50 border-slate-200 focus:border-violet-400 focus:ring-violet-400 h-12 text-base"
                    />
                  </div>
                </div>
                <Button 
                  onClick={
                    activeTab === 'blog-draft' ? handleGenerateBlog :
                    activeTab === 'faq' ? handleGenerateFAQ :
                    handleGenerateGBPPosts
                  }
                  disabled={isGenerating}
                  className={cn(
                    "w-full h-14 text-base shadow-md hover:shadow-lg bg-gradient-to-r",
                    activeTab === 'blog-draft' ? 'from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700' :
                    activeTab === 'faq' ? 'from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700' :
                    'from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700'
                  )}
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-5 h-5 mr-2" />
                      Generate
                    </>
                  )}
                </Button>
              </InputCard>
            )}

            {/* Error Display */}
            {error && (
              <Card className="bg-red-50 border-2 border-red-200">
                <CardContent className="p-4 flex items-start gap-3">
                  <X className="w-6 h-6 text-red-600 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-bold text-red-900">{error}</p>
                    <p className="text-xs text-red-700 mt-1">
                      {error.includes('API key') ? 
                        'Please add your OpenAI API key in the dashboard settings.' :
                        'Please try again or contact us if the issue persists.'}
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Result Display */}
            {result && (
              <Card className="bg-white shadow-lg border-slate-200">
                <CardHeader className="border-b border-slate-100">
                  <CardTitle className="flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <Sparkles className="w-5 h-5 text-violet-600" />
                      AI Generated Result
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleCopyToClipboard(result.content)}
                    >
                      <Copy className="w-4 h-4 mr-2" />
                      Copy
                    </Button>
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-6">
                  {result.type === 'ask_ai' && (
                    <div className="prose max-w-none">
                      <p className="whitespace-pre-wrap text-slate-700">{result.content}</p>
                    </div>
                  )}

                  {result.type === 'blog' && (
                    <div className="prose max-w-none">
                      <div className="whitespace-pre-wrap text-slate-700">{result.content}</div>
                    </div>
                  )}

                  {result.type === 'faq' && result.faqs && result.faqs.length > 0 && (
                    <div className="space-y-4">
                      {result.faqs.map((faq, idx) => (
                        <Card key={idx} className="bg-slate-50 border-slate-200">
                          <CardContent className="p-4">
                            <p className="font-semibold text-slate-900 mb-2">{faq.question}</p>
                            <p className="text-slate-600 text-sm">{faq.answer}</p>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}

                  {result.type === 'gbp_posts' && result.posts && result.posts.length > 0 && (
                    <div className="space-y-4">
                      {result.posts.map((post, idx) => (
                        <Card key={idx} className="bg-slate-50 border-slate-200">
                          <CardContent className="p-4">
                            <p className="font-semibold text-slate-900 mb-2">{post.title}</p>
                            <p className="text-slate-600 text-sm mb-3">{post.content}</p>
                            <Badge className="bg-indigo-100 text-indigo-700 border-indigo-200">
                              CTA: {post.cta}
                            </Badge>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>

          {/* History Sidebar */}
          <div className="lg:col-span-1">
            <Card className="bg-white shadow-lg border-slate-200 sticky top-6">
              <CardHeader className="border-b border-slate-100">
                <CardTitle className="text-lg flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-indigo-600" />
                  Recent History
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4">
                {history.length === 0 ? (
                  <p className="text-sm text-slate-500 text-center py-8">
                    No history yet. Generate something to get started!
                  </p>
                ) : (
                  <div className="space-y-3">
                    {history.map((item, idx) => (
                      <Card key={item.id || idx} className="bg-slate-50 border-slate-200 cursor-pointer hover:bg-slate-100 transition-colors">
                        <CardContent className="p-3">
                          <p className="text-xs text-slate-500 mb-1">
                            {new Date(item.created_date).toLocaleDateString()}
                          </p>
                          <p className="text-sm text-slate-700 line-clamp-2">
                            {item.input?.question || `${item.input?.niche} in ${item.input?.city}`}
                          </p>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}