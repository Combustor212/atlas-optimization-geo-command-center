import React from 'react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import MarketingHeader from '../components/MarketingHeader';
import { ArrowRight, Search, MessageSquare, Check, X } from 'lucide-react';

export default function InvisibilityPage() {
  const navigate = useNavigate();

  const handleCTA = () => {
    navigate('/beta');
  };

  return (
    <div className="min-h-screen bg-white">
      <MarketingHeader />
      
      {/* Hero Section */}
      <section className="pt-32 pb-20 sm:pt-40 sm:pb-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center mb-12"
          >
            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-extrabold text-slate-900 mb-6 leading-tight">
              Are You Invisible to AI?
            </h1>
            
            <p className="text-xl sm:text-2xl text-slate-600 max-w-4xl mx-auto mb-10 leading-relaxed">
              90% of local businesses rank on Google but are invisible on ChatGPT. Run our free AGS Scanner to see your Citation Authority Score (CAS).
            </p>

            <Button
              onClick={handleCTA}
              className="bg-theme-gradient text-white px-10 py-7 text-lg font-bold rounded-[16px] shadow-2xl hover:scale-105 transition-all"
            >
              Join Private Beta
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
          </motion.div>

          {/* Split-Screen Visual */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="max-w-6xl mx-auto mt-16"
          >
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
              {/* Google Search Side */}
              <div className="flex flex-col">
                <div className="flex items-center gap-2 mb-4">
                  <Search className="w-5 h-5 text-blue-600" />
                  <h3 className="text-lg font-bold text-slate-900">Google Search</h3>
                  <span className="ml-auto text-sm text-green-600 font-semibold flex items-center gap-1"><Check className="w-4 h-4" /> You are here</span>
                </div>
                
                <div className="bg-white border-2 border-slate-200 rounded-2xl p-6 shadow-lg flex-1">
                  <div className="space-y-4">
                    <div className="flex items-start gap-3">
                      <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="h-4 bg-blue-600 rounded w-3/4 mb-2" />
                        <div className="h-3 bg-slate-300 rounded w-full mb-1" />
                        <div className="h-3 bg-slate-300 rounded w-5/6" />
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
                      <div className="h-3 bg-amber-400 rounded w-20" />
                      <div className="h-3 bg-slate-200 rounded w-16" />
                      <div className="h-3 bg-slate-200 rounded w-24" />
                    </div>
                  </div>
                </div>
              </div>

              {/* ChatGPT Side */}
              <div className="flex flex-col">
                <div className="flex items-center gap-2 mb-4">
                  <MessageSquare className="w-5 h-5 text-purple-600" />
                  <h3 className="text-lg font-bold text-slate-900">ChatGPT Answer</h3>
                  <span className="ml-auto text-sm text-red-600 font-semibold flex items-center gap-1"><X className="w-4 h-4" /> You are missing</span>
                </div>
                
                <div className="bg-slate-50 border-2 border-dashed border-slate-300 rounded-2xl p-6 shadow-lg flex-1 flex items-center justify-center">
                  <div className="text-center">
                    <div className="w-16 h-16 mx-auto mb-4 bg-slate-200 rounded-full flex items-center justify-center">
                      <MessageSquare className="w-8 h-8 text-slate-400" />
                    </div>
                    <p className="text-slate-500 font-medium mb-1">Your business doesn't appear</p>
                    <p className="text-sm text-slate-400">AI can't find or recommend you</p>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Secondary CTA */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="text-center mt-12"
          >
            <p className="text-slate-600 mb-4">
              Discover your AI visibility gap in 60 seconds
            </p>
            <Button
              onClick={handleCTA}
              variant="outline"
              className="border-2 border-purple-600 text-purple-600 hover:bg-purple-50 px-8 py-6 text-base font-semibold rounded-xl"
            >
              Run Free Scan Now
            </Button>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 text-center">
          <p className="text-slate-400 text-sm">© 2025 AGS. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}