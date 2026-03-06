import React, { useState } from 'react';
import { Check, Zap, Target, Brain, MapPin, Star, MessageCircle, ArrowRight, Mail, Globe, Shield, Briefcase, CheckCircle2, Phone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useNavigate, Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import MarketingHeader from '../components/MarketingHeader';
import SEOHead from '../components/cms/SEOHead';
import PricingSection from '../components/PricingSection';



// ============================================================================
// HOW IT WORKS STEPS
// ============================================================================
const HOW_IT_WORKS_STEPS = [
  {
    step: 1,
    icon: Target,
    color: 'bg-gradient-to-br from-purple-500 to-purple-600',
    title: 'Enter Business Info',
    description: 'Type your business name and location. Our AI finds your profiles automatically.'
  },
  {
    step: 2,
    icon: Brain,
    color: 'bg-gradient-to-br from-indigo-500 to-indigo-600',
    title: 'AI Scans Visibility',
    description: 'Our engine analyzes 100+ signals across Google Maps, AI search, and review platforms.'
  },
  {
    step: 3,
    icon: Zap,
    color: 'bg-gradient-to-br from-blue-500 to-blue-600',
    title: 'Get Your Scores',
    description: 'See your MEO, GEO, and overall visibility score with actionable recommendations.'
  }
];

// ============================================================================
// METRICS
// ============================================================================
const METRICS = [
  {
    icon: MapPin,
    title: 'MEO',
    subtitle: 'Maps Engine Optimization',
    description: 'Your visibility across Google Maps, Apple Maps, and local search results.',
    gradient: 'from-green-400 to-emerald-500'
  },
  {
    icon: Brain,
    title: 'GEO',
    subtitle: 'Generative Engine Optimization',
    description: 'How often AI engines like ChatGPT and Perplexity recommend your business.',
    gradient: 'from-purple-400 to-indigo-500'
  },
  {
    icon: Star,
    title: 'Reviews',
    subtitle: 'Authority Score',
    description: 'Your reputation score based on review volume, ratings, and recency.',
    gradient: 'from-amber-400 to-orange-500'
  }
];

// ============================================================================
// TESTIMONIALS
// ============================================================================
const TESTIMONIALS = [
  {
    name: 'Sarah Johnson',
    business: 'Café Owner, Miami',
    quote: 'AGS showed us exactly where we were losing customers to competitors. Fixed it in a week.',
    avatar: 'https://avatar.vercel.sh/sarah'
  },
  {
    name: 'Mike Chen',
    business: 'HVAC Company, Phoenix',
    quote: 'Best investment we made this year. Our phones haven\'t stopped ringing since optimizing with AGS.',
    avatar: 'https://avatar.vercel.sh/mike'
  },
  {
    name: 'Lisa Rodriguez',
    business: 'Real Estate Agent, Austin',
    quote: 'I didn\'t even know AI search was a thing. Now I\'m ranking #1 for my area.',
    avatar: 'https://avatar.vercel.sh/lisa'
  }
];



// ============================================================================
// HOW IT WORKS SECTION
// ============================================================================
const HowItWorksSection = () => {
  return (
    <section className="py-20 bg-gradient-to-b from-slate-50 to-white">
      <div className="max-w-[1080px] mx-auto px-6">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold text-slate-900 mb-4">
            How It Works
          </h2>
          <p className="text-lg text-slate-600 max-w-2xl mx-auto">
            Get AI-powered visibility insights in 60 seconds
          </p>
        </div>

        {/* Steps Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
          {/* Connecting Line (Desktop Only) */}
          <div className="hidden md:block absolute top-16 left-0 right-0 h-[2px] bg-gradient-to-r from-purple-200 via-indigo-200 to-blue-200 z-0" />
          
          {HOW_IT_WORKS_STEPS.map((step, index) => {
            const Icon = step.icon;
            
            return (
              <motion.div
                key={step.step}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.15 }}
                className="relative z-10"
              >
                <Card className="bg-white border border-slate-200 shadow-sm hover:shadow-lg transition-all h-full rounded-[18px]">
                  <CardContent className="p-8 text-center">
                    {/* Step Number & Icon */}
                    <div className="relative mb-6">
                      <div className={cn("w-20 h-20 mx-auto rounded-full flex items-center justify-center shadow-lg", step.color)}>
                        <Icon className="w-10 h-10 text-white" />
                      </div>
                      <div className="absolute -top-2 -right-2 w-8 h-8 bg-white border-2 border-slate-200 rounded-full flex items-center justify-center font-bold text-slate-700 shadow-sm">
                        {step.step}
                      </div>
                    </div>

                    {/* Content */}
                    <h3 className="text-xl font-bold text-slate-900 mb-3">
                      {step.title}
                    </h3>
                    <p className="text-sm text-slate-600 leading-relaxed">
                      {step.description}
                    </p>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

// ============================================================================
// WHAT'S MEASURED SECTION
// ============================================================================
const MetricsSection = () => {
  return (
    <section className="py-20 bg-white">
      <div className="max-w-[1080px] mx-auto px-6">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold text-slate-900 mb-4">
            What's Measured
          </h2>
          <p className="text-lg text-slate-600 max-w-2xl mx-auto">
            Three core visibility metrics that drive local business growth
          </p>
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {METRICS.map((metric, index) => {
            const Icon = metric.icon;
            
            return (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                whileHover={{ y: -4 }}
                className="group"
              >
                <Card className="bg-white border border-slate-200 shadow-sm hover:shadow-lg transition-all h-full rounded-[18px]">
                  <CardContent className="p-8 text-center">
                    {/* Icon with Gradient Background */}
                    <motion.div 
                      className={cn(
                        "w-16 h-16 mx-auto mb-6 rounded-2xl flex items-center justify-center shadow-md bg-gradient-to-br",
                        metric.gradient
                      )}
                      whileHover={{ scale: 1.05 }}
                      transition={{ type: "spring", stiffness: 300 }}
                    >
                      <Icon className="w-8 h-8 text-white" />
                    </motion.div>

                    {/* Content */}
                    <h3 className="text-2xl font-bold text-slate-900 mb-1">
                      {metric.title}
                    </h3>
                    <p className="text-sm font-medium text-slate-500 mb-3">
                      {metric.subtitle}
                    </p>
                    <p className="text-sm text-slate-600 leading-relaxed">
                      {metric.description}
                    </p>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

// ============================================================================
// TESTIMONIALS SECTION
// ============================================================================
const TestimonialsSection = () => {
  return (
    <section className="py-20 bg-gradient-to-b from-slate-50 to-white">
      <div className="max-w-[1080px] mx-auto px-6">
        {/* Header */}
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold text-slate-900 mb-4">
            Why Businesses Love AGS
          </h2>
          <p className="text-lg text-slate-600 mb-3">
            Trusted by 100+ businesses scanning weekly
          </p>
          <p className="text-sm text-purple-600 font-medium flex items-center gap-2">
            <Star className="w-4 h-4" />
            Rated 4.9/5 from early testers
          </p>
        </div>

        {/* Testimonials Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {TESTIMONIALS.map((testimonial, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
            >
              <Card className="bg-white rounded-[20px] shadow-sm hover:shadow-lg transition-all h-full border-0 relative overflow-hidden">
                {/* Top Accent Line */}
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-purple-600 to-indigo-600" />
                
                <CardContent className="p-8 pt-10">
                  {/* Avatar & Info */}
                  <div className="flex items-center gap-4 mb-6">
                    <img
                      src={testimonial.avatar}
                      alt={testimonial.name}
                      className="w-14 h-14 rounded-full shadow-md"
                    />
                    <div>
                      <div className="font-bold text-slate-900">{testimonial.name}</div>
                      <div className="text-sm text-slate-500">{testimonial.business}</div>
                    </div>
                  </div>

                  {/* Quote */}
                  <p className="text-slate-700 leading-relaxed italic mb-4">
                    "{testimonial.quote}"
                  </p>

                  {/* Stars */}
                  <div className="flex gap-1">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                    ))}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

// ============================================================================
// FINAL CTA SECTION
// ============================================================================
const FinalCTASection = () => {
  const navigate = useNavigate();

  return (
    <section className="py-20 bg-gradient-to-br from-purple-600 via-indigo-600 to-blue-600">
      <div className="max-w-[1080px] mx-auto px-6 text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <h2 className="text-4xl lg:text-5xl font-bold text-white mb-6">
            Ready to Boost Your Visibility?
          </h2>
          <p className="text-xl text-indigo-100 mb-8 max-w-2xl mx-auto leading-relaxed">
            Join 100+ businesses using AGS to dominate AI search, maps, and local visibility
          </p>
          
          <Button
            onClick={() => navigate(createPageUrl('Landing'))}
            className="bg-white text-purple-600 hover:bg-slate-50 px-10 py-7 text-lg font-bold rounded-[16px] shadow-2xl hover:shadow-white/30 hover:scale-105 transition-all"
          >
            <Zap className="w-6 h-6 mr-2" />
            Run Free Scan
            <ArrowRight className="w-5 h-5 ml-2" />
          </Button>
          
          <p className="text-sm text-indigo-200 mt-6">
            No credit card required • Instant AI-powered report • 100% free
          </p>
        </motion.div>
      </div>
    </section>
  );
};

// ============================================================================
// FOOTER
// ============================================================================
const Footer = () => {
  return (
    <footer className="bg-slate-900 text-white py-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-12 mb-12">
          <div>
            <h4 className="font-semibold mb-4 text-lg">Product</h4>
            <ul className="space-y-3 text-slate-400">
              <li><Link to={createPageUrl('pricing')} className="hover:text-white transition-colors">Plans</Link></li>
              <li><Link to={createPageUrl('HowWorks')} className="hover:text-white transition-colors">How It Works</Link></li>
              <li><Link to={createPageUrl('AITools')} className="hover:text-white transition-colors">AI Tools</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold mb-4 text-lg">Contact</h4>
            <ul className="space-y-3 text-slate-400">
              <li className="flex items-center gap-2">
                <Mail className="w-4 h-4" />
                <a href="mailto:info@atlasgrowths.com" className="hover:text-white transition-colors">info@atlasgrowths.com</a>
              </li>
              <li className="flex items-center gap-2">
                <Phone className="w-4 h-4" />
                <a href="tel:513-999-4390" className="hover:text-white transition-colors">513-999-4390</a>
              </li>
            </ul>
          </div>
        </div>
        
        <div className="border-t border-slate-800 pt-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4 text-center">
            <p className="text-slate-400 text-sm">© 2025 AGS. All rights reserved.</p>
            <div className="flex gap-6 text-sm text-slate-400">
              <Link to={createPageUrl('PrivacyPolicy')} className="hover:text-white transition-colors">Privacy Policy</Link>
              <Link to={createPageUrl('TermsOfService')} className="hover:text-white transition-colors">Terms of Service</Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

// ============================================================================
// MAIN PAGE EXPORT
// ============================================================================
export default function PricingPage({ user }) {
  return (
    <div className="min-h-screen bg-white">
      <SEOHead pageName="pricing" />
      <MarketingHeader />
      
      <PricingSection />
      <HowItWorksSection />
      <MetricsSection />
      <TestimonialsSection />
      <FinalCTASection />
      <Footer />
    </div>
  );
}