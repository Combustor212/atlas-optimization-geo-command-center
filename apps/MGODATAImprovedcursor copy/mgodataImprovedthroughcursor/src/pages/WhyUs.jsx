
import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Star, Shield, TrendingUp, Users, CheckCircle2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import MarketingHeader from '../components/MarketingHeader';

const testimonials = [
  {
    name: 'Sarah Johnson',
    business: 'The Corner Café',
    image: 'https://i.pravatar.cc/150?img=1',
    rating: 5,
    text: 'AGS helped us appear in ChatGPT recommendations and doubled our foot traffic in 60 days. The automated review system alone was worth it!'
  },
  {
    name: 'Michael Chen',
    business: 'Chen & Associates Law',
    image: 'https://i.pravatar.cc/150?img=13',
    rating: 5,
    text: 'We rank #1 in the map pack for 15 keywords now. The ROI has been incredible—we\'ve signed 20% more clients this quarter.'
  },
  {
    name: 'Emily Rodriguez',
    business: 'FitLife Studio',
    image: 'https://i.pravatar.cc/150?img=5',
    rating: 5,
    text: 'Finally, a platform that understands local SEO. Our GEO score went from 35% to 89%, and we\'re showing up everywhere our customers search.'
  }
];

const WhyUsPage = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-emerald-50">
      <MarketingHeader />

      {/* Hero Section */}
      <div className="pt-32 pb-20">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-16">
            <h1 className="text-5xl lg:text-6xl font-bold text-slate-900 mb-6">
              Why Businesses Choose{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-green-600 to-emerald-600">
                AGS
              </span>
            </h1>
            <p className="text-xl text-slate-600 max-w-3xl mx-auto mb-8">
              Real results from real businesses. See why hundreds of local businesses trust us to dominate their markets.
            </p>
            <Link to={createPageUrl('signup')}>
              <Button size="lg" className="bg-green-600 hover:bg-green-700 text-white shadow-lg transform hover:scale-105 transition-transform duration-200">
                Get Started Today
              </Button>
            </Link>
          </div>

          {/* Trust Badges */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-20">
            <Card className="bg-white border-slate-200 shadow-lg text-center">
              <CardContent className="pt-8 pb-8">
                <div className="w-16 h-16 mx-auto mb-4 bg-green-100 rounded-2xl flex items-center justify-center">
                  <Users className="w-8 h-8 text-green-600" />
                </div>
                <div className="text-4xl font-bold text-slate-900 mb-2">100+</div>
                <p className="text-slate-600">Happy Businesses</p>
              </CardContent>
            </Card>
            <Card className="bg-white border-slate-200 shadow-lg text-center">
              <CardContent className="pt-8 pb-8">
                <div className="w-16 h-16 mx-auto mb-4 bg-yellow-100 rounded-2xl flex items-center justify-center">
                  <Star className="w-8 h-8 text-yellow-600 fill-yellow-600" />
                </div>
                <div className="text-4xl font-bold text-slate-900 mb-2 flex items-center justify-center gap-1">4.9<Star className="w-6 h-6 text-yellow-600 fill-yellow-600" /></div>
                <p className="text-slate-600">Average Rating</p>
              </CardContent>
            </Card>
            <Card className="bg-white border-slate-200 shadow-lg text-center">
              <CardContent className="pt-8 pb-8">
                <div className="w-16 h-16 mx-auto mb-4 bg-blue-100 rounded-2xl flex items-center justify-center">
                  <TrendingUp className="w-8 h-8 text-blue-600" />
                </div>
                <div className="text-4xl font-bold text-slate-900 mb-2">85%</div>
                <p className="text-slate-600">Avg GEO Score Increase</p>
              </CardContent>
            </Card>
            <Card className="bg-white border-slate-200 shadow-lg text-center">
              <CardContent className="pt-8 pb-8">
                <div className="w-16 h-16 mx-auto mb-4 bg-purple-100 rounded-2xl flex items-center justify-center">
                  <Shield className="w-8 h-8 text-purple-600" />
                </div>
                <div className="text-4xl font-bold text-slate-900 mb-2">100%</div>
                <p className="text-slate-600">Money-Back Guarantee</p>
              </CardContent>
            </Card>
          </div>

          {/* Testimonials */}
          <div className="mb-20">
            <h2 className="text-3xl font-bold text-slate-900 mb-12 text-center">What Our Customers Say</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {testimonials.map((testimonial, index) => (
                <Card key={index} className="bg-white border-slate-200 shadow-lg">
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-4 mb-4">
                      <img 
                        src={testimonial.image} 
                        alt={testimonial.name}
                        className="w-16 h-16 rounded-full"
                      />
                      <div>
                        <p className="font-bold text-slate-900">{testimonial.name}</p>
                        <p className="text-sm text-slate-500">{testimonial.business}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 mb-4">
                      {[...Array(testimonial.rating)].map((_, i) => (
                        <Star key={i} className="w-5 h-5 fill-yellow-400 text-yellow-400" />
                      ))}
                    </div>
                    <p className="text-slate-600 italic">"{testimonial.text}"</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* Value Props */}
          <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-3xl p-12 mb-16">
            <h2 className="text-3xl font-bold text-slate-900 mb-8 text-center">Why We're Different</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
              <div className="flex items-start gap-4">
                <CheckCircle2 className="w-6 h-6 text-green-600 shrink-0 mt-1" />
                <div>
                  <h3 className="font-bold text-slate-900 mb-2">AI-Powered Everything</h3>
                  <p className="text-slate-600">No manual work. Our AI handles GEO, MEO, and SEO optimization automatically.</p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <CheckCircle2 className="w-6 h-6 text-green-600 shrink-0 mt-1" />
                <div>
                  <h3 className="font-bold text-slate-900 mb-2">Real Results, Fast</h3>
                  <p className="text-slate-600">Most customers see visibility improvements within 2-3 weeks, major gains in 60-90 days.</p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <CheckCircle2 className="w-6 h-6 text-green-600 shrink-0 mt-1" />
                <div>
                  <h3 className="font-bold text-slate-900 mb-2">All-In-One Platform</h3>
                  <p className="text-slate-600">Stop juggling multiple tools. Everything you need in one dashboard.</p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <CheckCircle2 className="w-6 h-6 text-green-600 shrink-0 mt-1" />
                <div>
                  <h3 className="font-bold text-slate-900 mb-2">Cancel Anytime</h3>
                  <p className="text-slate-600">No contracts, no commitments. Cancel with one click, no questions asked.</p>
                </div>
              </div>
            </div>
          </div>

          <div className="text-center pb-20">
            <h2 className="text-3xl font-bold text-slate-900 mb-6">Ready to Dominate Your Local Market?</h2>
            <p className="text-xl text-slate-600 max-w-2xl mx-auto mb-8">
              Join hundreds of businesses experiencing real growth with AGS's AI-powered local SEO.
            </p>
            <Link to={createPageUrl('signup')}>
              <Button size="lg" className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg transform hover:scale-105 transition-transform duration-200">
                Get Started
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WhyUsPage;
