import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, Star } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import MarketingHeader from '../components/MarketingHeader';

const caseStudies = [
  {
    industry: 'Restaurant',
    location: 'Chicago, IL',
    businessName: 'Joe\'s Pizza',
    before: { meoScore: 45, geoScore: 30, rating: 3.8, reviews: 89 },
    after: { meoScore: 92, geoScore: 85, rating: 4.7, reviews: 247 },
    testimonial: 'AGS helped us appear in ChatGPT recommendations and doubled our foot traffic in 60 days.',
    avatar: 'https://i.pravatar.cc/150?img=1'
  },
  {
    industry: 'Law Firm',
    location: 'Austin, TX',
    businessName: 'Chen & Associates Law',
    before: { meoScore: 38, geoScore: 25, rating: 4.1, reviews: 52 },
    after: { meoScore: 88, geoScore: 78, rating: 4.8, reviews: 156 },
    testimonial: 'We rank #1 in the map pack for 15 keywords now. The ROI has been incredible.',
    avatar: 'https://i.pravatar.cc/150?img=13'
  },
  {
    industry: 'Fitness Studio',
    location: 'Seattle, WA',
    businessName: 'FitLife Studio',
    before: { meoScore: 52, geoScore: 35, rating: 4.3, reviews: 78 },
    after: { meoScore: 94, geoScore: 89, rating: 4.9, reviews: 312 },
    testimonial: 'Finally, a platform that understands local SEO. Our GEO score went from 35% to 89%.',
    avatar: 'https://i.pravatar.cc/150?img=5'
  }
];

const CaseStudiesPage = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-amber-50">
      <MarketingHeader />

      {/* Hero Section */}
      <div className="py-20 pt-32">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-16">
            <h1 className="text-5xl lg:text-6xl font-bold text-slate-900 mb-6">
              Real Results from{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-600 to-amber-600">
                Real Businesses
              </span>
            </h1>
            <p className="text-xl text-slate-600 max-w-3xl mx-auto">
              See how AGS transformed local visibility for businesses across industries
            </p>
          </div>

          {/* Average Improvement Stats */}
          <div className="bg-white rounded-2xl p-12 shadow-xl mb-16 border border-slate-200">
            <h2 className="text-3xl font-bold text-slate-900 mb-8 text-center">
              Average Performance Improvement
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="text-center">
                <div className="text-6xl font-bold text-indigo-600 mb-3">+98%</div>
                <p className="text-lg text-slate-600 mb-4">MEO Visibility Score</p>
                <div className="w-full bg-slate-100 rounded-full h-4">
                  <div className="bg-gradient-to-r from-indigo-500 to-indigo-600 h-4 rounded-full" style={{ width: '98%' }} />
                </div>
              </div>
              <div className="text-center">
                <div className="text-6xl font-bold text-purple-600 mb-3">+85%</div>
                <p className="text-lg text-slate-600 mb-4">GEO Mentions</p>
                <div className="w-full bg-slate-100 rounded-full h-4">
                  <div className="bg-gradient-to-r from-purple-500 to-purple-600 h-4 rounded-full" style={{ width: '85%' }} />
                </div>
              </div>
              <div className="text-center">
                <div className="text-6xl font-bold text-green-600 mb-3">+250%</div>
                <p className="text-lg text-slate-600 mb-4">Review Growth</p>
                <div className="w-full bg-slate-100 rounded-full h-4">
                  <div className="bg-gradient-to-r from-green-500 to-green-600 h-4 rounded-full w-full" />
                </div>
              </div>
            </div>
          </div>

          {/* Case Studies */}
          <h2 className="text-3xl font-bold text-slate-900 mb-8 text-center">Featured Case Studies</h2>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {caseStudies.map((study, index) => (
              <Card key={index} className="bg-white border-slate-200 shadow-lg hover:shadow-2xl transition-all">
                <CardHeader>
                  <div className="flex items-center justify-between mb-4">
                    <Badge className="bg-orange-100 text-orange-700 border-orange-200">{study.industry}</Badge>
                    <span className="text-sm text-slate-500">{study.location}</span>
                  </div>
                  <CardTitle className="text-xl">{study.businessName}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Before/After Stats */}
                  <div className="space-y-4">
                    <div>
                      <div className="flex justify-between text-sm mb-2">
                        <span className="text-slate-600">MEO Score</span>
                        <span className="font-bold text-indigo-600">
                          {study.before.meoScore}% → {study.after.meoScore}%
                        </span>
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-3">
                        <div 
                          className="bg-gradient-to-r from-indigo-500 to-indigo-600 h-3 rounded-full transition-all"
                          style={{ width: `${study.after.meoScore}%` }}
                        />
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between text-sm mb-2">
                        <span className="text-slate-600">GEO Score</span>
                        <span className="font-bold text-purple-600">
                          {study.before.geoScore}% → {study.after.geoScore}%
                        </span>
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-3">
                        <div 
                          className="bg-gradient-to-r from-purple-500 to-purple-600 h-3 rounded-full transition-all"
                          style={{ width: `${study.after.geoScore}%` }}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                      <div>
                        <p className="text-xs text-slate-500">Rating</p>
                        <div className="flex items-center gap-1">
                          <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                          <p className="text-lg font-bold text-slate-900">
                            {study.after.rating}
                          </p>
                        </div>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500">Reviews</p>
                        <div className="flex items-center gap-1">
                          <TrendingUp className="w-4 h-4 text-green-600" />
                          <p className="text-lg font-bold text-slate-900">
                            {study.after.reviews}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Testimonial */}
                  <div className="pt-4 border-t">
                    <p className="text-sm text-slate-600 italic">"{study.testimonial}"</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* CTA Section */}
          <div className="mt-20 bg-gradient-to-r from-orange-600 to-amber-600 rounded-3xl p-12 text-center text-white">
            <h2 className="text-3xl lg:text-4xl font-bold mb-4">
              Want Results Like These?
            </h2>
            <p className="text-xl text-orange-100 mb-8 max-w-2xl mx-auto">
              Join hundreds of local businesses using AGS to dominate their markets
            </p>
            <Link to={createPageUrl('pricing')}>
              <Button className="bg-white text-orange-600 hover:bg-slate-50 px-8 py-6 h-auto text-lg font-bold shadow-xl">
                Get Started
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CaseStudiesPage;