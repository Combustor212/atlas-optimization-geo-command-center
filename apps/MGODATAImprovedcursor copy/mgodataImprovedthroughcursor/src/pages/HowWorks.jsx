import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Search, BarChart, Zap, Target, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import MarketingHeader from '../components/MarketingHeader';

const steps = [
  {
    number: 1,
    icon: Search,
    title: "Free Visibility Scan",
    body: "We analyze 100+ signals across Maps, AI search, and your website.",
    color: "text-purple-600",
    bg: "bg-purple-50",
    border: "border-purple-100"
  },
  {
    number: 2,
    icon: BarChart,
    title: "AI Visibility Audit",
    body: "You get a clear report showing what hurts visibility.",
    color: "text-pink-600",
    bg: "bg-pink-50",
    border: "border-pink-100"
  },
  {
    number: 3,
    icon: Zap,
    title: "Done-For-You Fixes",
    body: "We handle SEO, Maps, schema, reviews, content updates.",
    color: "text-emerald-600",
    bg: "bg-emerald-50",
    border: "border-emerald-100"
  },
  {
    number: 4,
    icon: Target,
    title: "Become Unavoidable",
    body: "You show up on Maps, ChatGPT, and AI results.",
    color: "text-orange-600",
    bg: "bg-orange-50",
    border: "border-orange-100"
  }
];

const HowWorksPage = () => {
  return (
    <div className="min-h-screen bg-white">
      <MarketingHeader />

      {/* Hero / Process Section */}
      <div className="py-32 bg-gradient-to-b from-purple-50/30 via-white to-purple-50/10">
        <div className="max-w-[1000px] mx-auto px-6">
          {/* Header */}
          <div className="text-center mb-24">
            <span className="inline-block px-3 py-1 rounded-full bg-white border border-slate-200 text-slate-600 text-[11px] font-bold tracking-wider uppercase mb-6 shadow-sm">
              THE PROCESS
            </span>
            <h1 className="text-4xl lg:text-5xl font-bold text-slate-900 mb-6 tracking-tight">
              How AGS Works
            </h1>
            <p className="text-lg text-slate-500 max-w-2xl mx-auto leading-relaxed mb-8">
              A simple system to fix your visibility and make your business appear everywhere customers search.
            </p>
            <div className="h-[1px] w-32 mx-auto bg-slate-200/60"></div>
          </div>

          {/* Steps Grid */}
          <div className="relative">
            {/* Timeline - Desktop only */}
            <div className="hidden lg:block absolute top-[24px] left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-slate-200 to-transparent z-0" />

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-6">
              {steps.map((step, index) => {
                const Icon = step.icon;
                return (
                  <div key={index} className="relative group flex flex-col h-full">
                    {/* Icon Wrapper */}
                    <div className="mx-auto relative mb-6 z-10">
                      {/* Number Label */}
                      <div className="absolute -top-6 left-1/2 -translate-x-1/2 text-[10px] font-bold text-slate-400 mb-2">
                        0{step.number}
                      </div>
                      
                      <div className={`w-12 h-12 rounded-2xl bg-white border border-slate-200 flex items-center justify-center relative z-10 shadow-sm group-hover:shadow-md group-hover:scale-110 transition-all duration-300 group-hover:border-slate-300`}>
                         <Icon className={`w-6 h-6 ${step.color} stroke-[1.5px]`} />
                      </div>
                    </div>

                    {/* Card */}
                    <div className="flex-1 bg-white rounded-[18px] p-6 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)] border border-slate-100 group-hover:-translate-y-1 group-hover:shadow-[0_8px_20px_-6px_rgba(0,0,0,0.08)] transition-all duration-300 flex flex-col items-center text-center">
                      <h3 className="text-[18px] font-bold text-slate-900 mb-2">{step.title}</h3>
                      <p className="text-[14px] text-slate-500 leading-relaxed">
                        {step.body}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 pb-20">
        <div className="mt-20 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-3xl p-12 text-center text-white">
          <h2 className="text-3xl lg:text-4xl font-bold mb-4">
            Ready to Get Started?
          </h2>
          <p className="text-xl text-indigo-100 mb-8 max-w-2xl mx-auto">
            Join hundreds of local businesses using AGS to dominate AI answers, Maps, and local search
          </p>
          <Link to={createPageUrl('pricing')}>
            <Button className="bg-white text-indigo-600 hover:bg-slate-50 px-8 py-6 h-auto text-lg font-bold shadow-xl hover:shadow-2xl transition-all">
              Get Started
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default HowWorksPage;