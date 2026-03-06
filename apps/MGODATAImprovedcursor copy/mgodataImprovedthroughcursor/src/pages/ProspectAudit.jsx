
import React, { useState, useEffect, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Prospect, AuditResult, ContentKit } from '@/api/entities';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { 
  ArrowLeft, 
  Download, 
  Target, 
  Sparkles,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Copy,
  FileText,
  MapPin,
  Star,
  Image as ImageIcon,
  MessageSquare,
  Tag,
  Globe,
  Newspaper,
  Link as LinkIcon,
  Code,
  Building, // Added Building icon
  Mail // Added Mail icon
} from 'lucide-react';
import { toast } from 'sonner';

// Circular Score Ring Component
const ScoreRing = ({ label, score, description }) => {
  const getColor = () => {
    if (score >= 75) return 'text-green-600';
    if (score >= 50) return 'text-yellow-600';
    return 'text-red-600';
  };

  const strokeDasharray = `${score} 100`;

  return (
    <Card className="bg-white/80 backdrop-blur-sm border-slate-200/60 shadow-lg">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium text-slate-600">{label}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col items-center">
          <div className="relative w-32 h-32">
            <svg className="w-32 h-32 transform -rotate-90">
              <circle
                cx="64"
                cy="64"
                r="56"
                stroke="currentColor"
                strokeWidth="8"
                fill="none"
                className="text-slate-200"
              />
              <circle
                cx="64"
                cy="64"
                r="56"
                stroke="currentColor"
                strokeWidth="8"
                fill="none"
                strokeDasharray={strokeDasharray}
                strokeLinecap="round"
                className={getColor()}
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-3xl font-bold text-slate-900">{Math.round(score)}</span>
            </div>
          </div>
          <p className="text-xs text-center text-slate-600 mt-3">{description}</p>
        </div>
      </CardContent>
    </Card>
  );
};

// Quick Wins Timeline Component
const QuickWinsTimeline = ({ wins }) => {
  const periods = [
    { label: 'Days 1-7', items: [wins[0]] },
    { label: 'Days 8-14', items: [wins[1]] },
    { label: 'Days 15-30', items: [wins[2]] }
  ];

  return (
    <div className="space-y-6">
      {periods.map((period, idx) => (
        <div key={idx} className="relative pl-8 border-l-2 border-indigo-200">
          <div className="absolute -left-2.5 top-0 w-5 h-5 rounded-full bg-gradient-to-r from-indigo-600 to-purple-600 flex items-center justify-center">
            <span className="text-white text-xs font-bold">{idx + 1}</span>
          </div>
          <div className="mb-1 text-sm font-semibold text-indigo-600">{period.label}</div>
          {period.items.map((item, i) => item && (
            <p key={i} className="text-slate-700">{item}</p>
          ))}
        </div>
      ))}
    </div>
  );
};

// SWOT Panel Component
const SWOTPanel = ({ swot }) => {
  const sections = [
    { title: 'Strengths', items: swot.swotStrengths, color: 'green', icon: CheckCircle2, bg: 'bg-green-50', border: 'border-green-200' },
    { title: 'Weaknesses', items: swot.swotWeaknesses, color: 'red', icon: AlertTriangle, bg: 'bg-red-50', border: 'border-red-200' },
    { title: 'Opportunities', items: swot.swotOpportunities, color: 'blue', icon: Target, bg: 'bg-blue-50', border: 'border-blue-200' },
    { title: 'Threats', items: swot.swotThreats, color: 'orange', icon: TrendingUp, bg: 'bg-orange-50', border: 'border-orange-200' }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {sections.map((section) => {
        const Icon = section.icon;
        return (
          <Card key={section.title} className={`${section.bg} border-2 ${section.border}`}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Icon className={`w-5 h-5 text-${section.color}-600`} />
                {section.title}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {section.items?.map((item, i) => (
                  <li key={i} className="text-sm text-slate-700 flex items-start gap-2">
                    <span className="text-slate-400 mt-1">•</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};

// GBP Post Card Component
const GBPPostCard = ({ post, index }) => {
  return (
    <Card className="bg-white border-slate-200 overflow-hidden">
      <div className="h-2 bg-gradient-to-r from-indigo-600 to-purple-600" />
      <CardContent className="p-6">
        <div className="flex items-start gap-3 mb-4">
          <div className="w-12 h-12 rounded-full bg-gradient-to-r from-indigo-600 to-purple-600 flex items-center justify-center text-white font-bold">
            #{index}
          </div>
          <div>
            <h4 className="font-semibold text-slate-900">Google Business Post</h4>
            <p className="text-xs text-slate-500">Ready to publish</p>
          </div>
        </div>
        <p className="text-sm text-slate-700 mb-4">{post}</p>
        <Button size="sm" variant="outline" className="w-full">
          <Copy className="w-4 h-4 mr-2" />
          Copy Post
        </Button>
      </CardContent>
    </Card>
  );
};

// Content Asset Card Component
const ContentAssetCard = ({ title, content, icon: Icon, type }) => {
  const copyToClipboard = () => {
    navigator.clipboard.writeText(content);
    toast.success(`${title} copied to clipboard!`);
  };

  return (
    <Card className="bg-white/80 backdrop-blur-sm border-slate-200/60">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Icon className="w-5 h-5 text-indigo-600" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 mb-4">
          <p className="text-sm text-slate-700 whitespace-pre-wrap line-clamp-4">{content}</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={copyToClipboard} size="sm" variant="outline" className="flex-1">
            <Copy className="w-4 h-4 mr-2" />
            Copy
          </Button>
          {type === 'code' && (
            <Button size="sm" variant="outline">
              <Code className="w-4 h-4 mr-2" />
              View Full
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default function ProspectAudit() {
  const [prospect, setProspect] = useState(null);
  const [audit, setAudit] = useState(null);
  const [contentKit, setContentKit] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  
  const location = useLocation();
  const navigate = useNavigate();
  const prospectId = new URLSearchParams(location.search).get('id');

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [prospectData, auditData, contentKitData] = await Promise.all([
        Prospect.get(prospectId),
        AuditResult.filter({ prospectId }).then(results => results[0]),
        ContentKit.filter({ prospectId }).then(results => results[0])
      ]);

      setProspect(prospectData);
      setAudit(auditData);
      setContentKit(contentKitData);
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Failed to load audit data');
    }
    setIsLoading(false);
  }, [prospectId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const generateAudit = async () => {
    setIsGenerating(true);
    toast.info('Generating comprehensive audit and content kit...');

    try {
      const response = await fetch('/functions/generateAuditAndContent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prospectId })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate audit');
      }

      setAudit(data.auditResult);
      setContentKit(data.contentKit);
      toast.success('✅ Audit and content kit generated successfully!');
    } catch (error) {
      console.error('Error generating audit:', error);
      toast.error(error.message || 'Failed to generate audit');
    }
    setIsGenerating(false);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-600">Loading audit...</p>
        </div>
      </div>
    );
  }

  if (!prospect) {
    return (
      <div className="text-center py-12">
        <AlertTriangle className="w-16 h-16 text-red-500 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-slate-900 mb-2">Prospect Not Found</h2>
        <Button onClick={() => navigate(createPageUrl('GeoMeoOperator'))}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Operator
        </Button>
      </div>
    );
  }

  const getPriorityBadge = (priority) => {
    const colors = {
      High: 'bg-red-100 text-red-700 border-red-200',
      Medium: 'bg-orange-100 text-orange-700 border-orange-200',
      Low: 'bg-green-100 text-green-700 border-green-200'
    };
    return colors[priority] || colors.Medium;
  };

  return (
    <div className="max-w-7xl mx-auto pb-12">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <Button
            variant="ghost"
            onClick={() => navigate(createPageUrl('GeoMeoOperator'))}
            className="mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Operator
          </Button>
          <div className="flex items-center gap-4">
            <div>
              <h1 className="text-3xl font-bold text-slate-900">{prospect.businessName}</h1>
              <div className="flex items-center gap-3 mt-2">
                <div className="flex items-center gap-1 text-slate-600">
                  <MapPin className="w-4 h-4" />
                  <span>{prospect.niche} • {prospect.city}</span>
                </div>
                {audit && (
                  <Badge className={`${getPriorityBadge(audit.priority)} border-2`}>
                    {audit.priority} Priority
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </div>
        <div className="flex gap-3">
          {!audit && (
            <Button
              onClick={generateAudit}
              disabled={isGenerating}
              className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700"
              size="lg"
            >
              {isGenerating ? (
                <>
                  <Clock className="w-5 h-5 mr-2 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5 mr-2" />
                  Generate Audit
                </>
              )}
            </Button>
          )}
          {audit && (
            <Button variant="outline" size="lg">
              <Download className="w-5 h-5 mr-2" />
              Download PDF
            </Button>
          )}
        </div>
      </div>

      {!audit ? (
        <Card className="bg-gradient-to-r from-indigo-50 to-purple-50 border-indigo-200">
          <CardContent className="py-16 text-center">
            <Sparkles className="w-20 h-20 text-indigo-600 mx-auto mb-6" />
            <h3 className="text-2xl font-bold text-slate-900 mb-3">Ready to Generate Audit</h3>
            <p className="text-slate-600 mb-8 max-w-2xl mx-auto">
              Generate a comprehensive GEO/MEO audit including scores, action plans, SWOT analysis, and a complete execution kit with ready-to-use marketing assets.
            </p>
            <Button
              onClick={generateAudit}
              disabled={isGenerating}
              className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700"
              size="lg"
            >
              {isGenerating ? 'Generating Audit...' : 'Generate Audit Now'}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Tabs defaultValue="snapshot" className="w-full">
          <TabsList className="grid w-full grid-cols-4 mb-8">
            <TabsTrigger value="snapshot">
              <Target className="w-4 h-4 mr-2" />
              Audit Snapshot
            </TabsTrigger>
            <TabsTrigger value="action-plan">
              <FileText className="w-4 h-4 mr-2" />
              Action Plan
            </TabsTrigger>
            <TabsTrigger value="execution-kit">
              <Sparkles className="w-4 h-4 mr-2" />
              Execution Kit
            </TabsTrigger>
            <TabsTrigger value="tracking">
              <TrendingUp className="w-4 h-4 mr-2" />
              Tracking
            </TabsTrigger>
          </TabsList>

          {/* Audit Snapshot Tab */}
          <TabsContent value="snapshot" className="space-y-8">
            {/* Scores Grid */}
            <div>
              <h2 className="text-2xl font-bold text-slate-900 mb-6">Visibility Scores</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <ScoreRing
                  label="NAP Consistency"
                  score={audit.consistencyScore}
                  description="Name, address, phone matching across directories"
                />
                <ScoreRing
                  label="Prominence"
                  score={audit.prominenceScore}
                  description="Reviews, ratings, and activity level"
                />
                <ScoreRing
                  label="Content Depth"
                  score={audit.contentDepthScore}
                  description="Website content and local optimization"
                />
                <ScoreRing
                  label="GEO Visibility"
                  score={audit.geoVisibilityScore}
                  description="AI answer engine presence"
                />
              </div>
            </div>

            {/* Quick Wins Timeline */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-xl">
                  <Clock className="w-6 h-6 text-indigo-600" />
                  30-Day Quick Wins Timeline
                </CardTitle>
                <p className="text-sm text-slate-600">Prioritized actions for immediate impact</p>
              </CardHeader>
              <CardContent>
                <QuickWinsTimeline wins={audit.quickWins30d || []} />
              </CardContent>
            </Card>

            {/* Map Visualization Placeholder */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-xl">
                  <MapPin className="w-6 h-6 text-indigo-600" />
                  Coverage Map
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64 bg-slate-100 rounded-lg flex items-center justify-center">
                  <div className="text-center text-slate-500">
                    <MapPin className="w-12 h-12 mx-auto mb-2 text-slate-400" />
                    <p>Map visualization coming soon</p>
                    <p className="text-sm">Location: {prospect.address}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Action Plan Tab */}
          <TabsContent value="action-plan" className="space-y-8">
            {/* MEO & GEO Fixes */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="bg-purple-50 border-purple-200">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-xl">
                    <MapPin className="w-6 h-6 text-purple-600" />
                    MEO Fixes
                  </CardTitle>
                  <p className="text-sm text-slate-600">Maps Engine Optimization</p>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-3">
                    {audit.meoFixes?.map((fix, i) => (
                      <li key={i} className="flex items-start gap-3 p-3 bg-white rounded-lg">
                        <CheckCircle2 className="w-5 h-5 text-purple-600 shrink-0 mt-0.5" />
                        <span className="text-slate-700">{fix}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>

              <Card className="bg-indigo-50 border-indigo-200">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-xl">
                    <Sparkles className="w-6 h-6 text-indigo-600" />
                    GEO Fixes
                  </CardTitle>
                  <p className="text-sm text-slate-600">Generative Engine Optimization</p>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-3">
                    {audit.geoFixes?.map((fix, i) => (
                      <li key={i} className="flex items-start gap-3 p-3 bg-white rounded-lg">
                        <CheckCircle2 className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
                        <span className="text-slate-700">{fix}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            </div>

            {/* SWOT Analysis */}
            <div>
              <h2 className="text-2xl font-bold text-slate-900 mb-6">SWOT Analysis</h2>
              <SWOTPanel swot={audit} />
            </div>

            {/* Internal Notes */}
            {audit.notesInternal && (
              <Card className="bg-slate-50 border-slate-200">
                <CardHeader>
                  <CardTitle className="text-lg">Internal Notes & Assumptions</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-slate-600">{audit.notesInternal}</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Execution Kit Tab */}
          <TabsContent value="execution-kit" className="space-y-8">
            {contentKit ? (
              <>
                {/* GBP Content */}
                <div>
                  <h2 className="text-2xl font-bold text-slate-900 mb-6">Google Business Profile Content</h2>
                  
                  {/* GBP Description */}
                  <div className="mb-6">
                    <ContentAssetCard
                      title="GBP Business Description"
                      content={contentKit.gbpDescription}
                      icon={Building}
                      type="text"
                    />
                  </div>

                  {/* GBP Posts */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                    <GBPPostCard post={contentKit.gbpPost1} index={1} />
                    <GBPPostCard post={contentKit.gbpPost2} index={2} />
                  </div>

                  {/* GBP Q&A */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <MessageSquare className="w-5 h-5 text-indigo-600" />
                        GBP Questions & Answers
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <Accordion type="single" collapsible className="w-full">
                        {contentKit.gbpQA?.map((qa, i) => (
                          <AccordionItem key={i} value={`item-${i}`}>
                            <AccordionTrigger className="text-left">
                              {qa.question}
                            </AccordionTrigger>
                            <AccordionContent className="text-slate-700">
                              {qa.answer}
                            </AccordionContent>
                          </AccordionItem>
                        ))}
                      </Accordion>
                    </CardContent>
                  </Card>
                </div>

                {/* Apple Business Connect */}
                <div>
                  <h2 className="text-2xl font-bold text-slate-900 mb-6">Apple Business Connect</h2>
                  <ContentAssetCard
                    title="About This Business"
                    content={contentKit.appleBusinessConnectAbout}
                    icon={Globe}
                    type="text"
                  />
                </div>

                {/* FAQ Page */}
                <div>
                  <h2 className="text-2xl font-bold text-slate-900 mb-6">FAQ Page Content</h2>
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-2xl">{contentKit.faqPageH1}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <Accordion type="single" collapsible className="w-full">
                        {contentKit.faqPageBody?.map((qa, i) => (
                          <AccordionItem key={i} value={`faq-${i}`}>
                            <AccordionTrigger className="text-left">
                              {qa.question}
                            </AccordionTrigger>
                            <AccordionContent className="text-slate-700">
                              {qa.answer}
                            </AccordionContent>
                          </AccordionItem>
                        ))}
                      </Accordion>
                    </CardContent>
                  </Card>
                </div>

                {/* Local Blogs */}
                <div>
                  <h2 className="text-2xl font-bold text-slate-900 mb-6">Local Blog Content</h2>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <Card>
                      <div className="h-40 bg-gradient-to-r from-indigo-500 to-purple-600 flex items-center justify-center">
                        <Newspaper className="w-16 h-16 text-white" />
                      </div>
                      <CardHeader>
                        <CardTitle>{contentKit.localBlog1Title}</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm text-slate-700 mb-4 line-clamp-3">
                          {contentKit.localBlog1Body?.substring(0, 200)}...
                        </p>
                        <Button variant="outline" className="w-full">
                          <FileText className="w-4 h-4 mr-2" />
                          Read Full Draft
                        </Button>
                      </CardContent>
                    </Card>

                    <Card>
                      <div className="h-40 bg-gradient-to-r from-purple-500 to-pink-600 flex items-center justify-center">
                        <Newspaper className="w-16 h-16 text-white" />
                      </div>
                      <CardHeader>
                        <CardTitle>{contentKit.localBlog2Title}</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm text-slate-700 mb-4 line-clamp-3">
                          {contentKit.localBlog2Body?.substring(0, 200)}...
                        </p>
                        <Button variant="outline" className="w-full">
                          <FileText className="w-4 h-4 mr-2" />
                          Read Full Draft
                        </Button>
                      </CardContent>
                    </Card>
                  </div>
                </div>

                {/* Schema JSON-LD */}
                <div>
                  <h2 className="text-2xl font-bold text-slate-900 mb-6">Schema Markup</h2>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <ContentAssetCard
                      title="FAQ Schema JSON-LD"
                      content={contentKit.schemaFaqJsonLd}
                      icon={Code}
                      type="code"
                    />
                    <ContentAssetCard
                      title="LocalBusiness Schema"
                      content={contentKit.schemaOrgLocalBusinessJsonLd}
                      icon={Code}
                      type="code"
                    />
                  </div>
                </div>

                {/* Review Management */}
                <div>
                  <h2 className="text-2xl font-bold text-slate-900 mb-6">Review Management Templates</h2>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                    <Card className="bg-blue-50 border-blue-200">
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <MessageSquare className="w-5 h-5 text-blue-600" />
                          SMS Review Request
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="bg-white p-4 rounded-lg border-2 border-blue-300 shadow-sm">
                          <p className="text-sm text-slate-700">{contentKit.reviewRequestSms}</p>
                        </div>
                        <Button onClick={() => {
                          navigator.clipboard.writeText(contentKit.reviewRequestSms);
                          toast.success('SMS template copied!');
                        }} size="sm" variant="outline" className="w-full mt-4">
                          <Copy className="w-4 h-4 mr-2" />
                          Copy Template
                        </Button>
                      </CardContent>
                    </Card>

                    <Card className="bg-green-50 border-green-200">
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <Mail className="w-5 h-5 text-green-600" />
                          Email Review Request
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="bg-white p-4 rounded-lg border-2 border-green-300 shadow-sm">
                          <p className="text-xs text-slate-500 mb-2">Subject: We'd love your feedback!</p>
                          <p className="text-sm text-slate-700 line-clamp-4">{contentKit.reviewRequestEmail}</p>
                        </div>
                        <Button onClick={() => {
                          navigator.clipboard.writeText(contentKit.reviewRequestEmail);
                          toast.success('Email template copied!');
                        }} size="sm" variant="outline" className="w-full mt-4">
                          <Copy className="w-4 h-4 mr-2" />
                          Copy Template
                        </Button>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Review Reply Templates */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Review Reply Templates</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {contentKit.reviewReplyTemplates?.map((template, i) => (
                          <div key={i} className="p-4 bg-slate-50 rounded-lg border">
                            <Badge className="mb-2">
                              {i === 0 ? '⭐ Positive' : i === 1 ? '➖ Neutral' : '⚠️ Negative'}
                            </Badge>
                            <p className="text-sm text-slate-700">{template}</p>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Cold Outreach */}
                <div>
                  <h2 className="text-2xl font-bold text-slate-900 mb-6">Cold Outreach</h2>
                  <Card className="bg-indigo-50 border-indigo-200">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Mail className="w-5 h-5 text-indigo-600" />
                        Service-Specific Outreach Email
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="bg-white p-6 rounded-lg border-2 border-indigo-300 shadow-sm">
                        <p className="text-sm text-slate-700 whitespace-pre-wrap">{contentKit.coldOutreachEmail}</p>
                      </div>
                      <Button onClick={() => {
                        navigator.clipboard.writeText(contentKit.coldOutreachEmail);
                        toast.success('Outreach email copied!');
                      }} size="sm" variant="outline" className="w-full mt-4">
                        <Copy className="w-4 h-4 mr-2" />
                        Copy Email
                      </Button>
                    </CardContent>
                  </Card>
                </div>
              </>
            ) : (
              <Card>
                <CardContent className="py-12 text-center">
                  <Sparkles className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                  <p className="text-slate-600">No content kit generated yet</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Tracking Tab */}
          <TabsContent value="tracking" className="space-y-8">
            <Card>
              <CardHeader>
                <CardTitle className="text-2xl">Performance Tracking Dashboard</CardTitle>
                <p className="text-slate-600">Monthly KPIs and progress reports</p>
              </CardHeader>
              <CardContent>
                <div className="bg-slate-50 rounded-lg p-12 text-center">
                  <TrendingUp className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                  <h3 className="text-xl font-bold text-slate-900 mb-2">Coming Soon</h3>
                  <p className="text-slate-600 max-w-md mx-auto">
                    Monthly KPI tracking including calls, reviews, ratings, GBP views, and AI answer presence will be available here
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
