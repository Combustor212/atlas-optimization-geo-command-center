
import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Star, Brain, MapPin, Target, BarChart, Globe } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import MarketingHeader from '../components/MarketingHeader';

const tools = [
  {
    icon: Star,
    title: 'Reputation Manager',
    description: 'Automate review requests, AI-powered responses, and sentiment analysis. Boost your ratings effortlessly.',
    color: 'from-violet-500 to-purple-500',
    bgColor: 'from-violet-50 to-purple-50'
  },
  {
    icon: Brain,
    title: 'GEO Operator',
    description: 'Optimize for AI answer engines like ChatGPT and Google AI. Dominate generative search results.',
    color: 'from-indigo-500 to-blue-500',
    bgColor: 'from-indigo-50 to-blue-50'
  },
  {
    icon: MapPin,
    title: 'Maps Health Audits',
    description: 'Monitor NAP consistency, category optimization, and map rankings across Google, Apple, and more.',
    color: 'from-green-500 to-emerald-500',
    bgColor: 'from-green-50 to-emerald-50'
  },
  {
    icon: Target,
    title: 'Business Assistant',
    description: 'AI-powered business insights, content generation, and automated workflows tailored to your niche.',
    color: 'from-amber-500 to-orange-500',
    bgColor: 'from-amber-50 to-orange-50'
  },
  {
    icon: BarChart,
    title: 'Competitor Watchdog',
    description: 'Track competitor rankings, review velocity, and visibility scores. Stay one step ahead.',
    color: 'from-pink-500 to-rose-500',
    bgColor: 'from-pink-50 to-rose-50'
  },
  {
    icon: Globe,
    title: 'Directory Sync Hub',
    description: 'Sync your business info across 50+ directories automatically. Ensure consistency everywhere.',
    color: 'from-cyan-500 to-teal-500',
    bgColor: 'from-cyan-50 to-teal-50'
  }
];

const AIToolsPage = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50">
      <MarketingHeader />

      {/* Hero Section */}
      <div className="py-20 pt-32">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-16">
            <h1 className="text-5xl lg:text-6xl font-bold text-slate-900 mb-6">
              AI-Powered{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600">
                Marketing Tools
              </span>
            </h1>
            <p className="text-xl text-slate-600 max-w-3xl mx-auto">
              Everything you need to dominate local visibility in one platform
            </p>
          </div>

          {/* Tools Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {tools.map((tool, index) => {
              const Icon = tool.icon;
              return (
                <Card key={index} className={`bg-gradient-to-br ${tool.bgColor} border-0 shadow-lg hover:shadow-2xl transition-all hover:-translate-y-2`}>
                  <CardHeader>
                    <div className={`w-16 h-16 mb-4 bg-gradient-to-r ${tool.color} rounded-2xl flex items-center justify-center`}>
                      <Icon className="w-8 h-8 text-white" />
                    </div>
                    <CardTitle className="text-2xl">{tool.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-slate-600">{tool.description}</p>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* CTA Section */}
          <div className="mt-20 text-center">
            <h2 className="text-3xl font-bold text-slate-900 mb-6">
              Ready to Unlock All Tools?
            </h2>
            <Link to={createPageUrl('pricing')}>
              <Button className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white px-8 py-6 h-auto text-lg font-bold shadow-xl">
                Get Started
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AIToolsPage;
