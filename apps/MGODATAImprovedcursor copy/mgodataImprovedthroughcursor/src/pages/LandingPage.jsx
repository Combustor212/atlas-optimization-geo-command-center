import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Check, Sparkles, Star } from 'lucide-react';
import { createPageUrl } from '@/utils';
import { Link, useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';

export default function LandingPage({ onStartDemo }) {
    const [isLoading, setIsLoading] = useState(false);
    const navigate = useNavigate();

    const handleGoogleSignIn = () => {
      navigate(createPageUrl('signin'));
    };

    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-[#f5f7fb] to-white px-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-14 h-14 mb-4 bg-indigo-100 rounded-2xl">
              <Sparkles className="w-8 h-8 text-indigo-600" />
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900">
              Unlock Your Local Visibility
            </h1>
            <p className="text-slate-600 mt-2">
              Manage your AI, Map & Search presence in one platform.
            </p>
          </div>
  
          <div className="bg-white/80 backdrop-blur-sm p-8 rounded-2xl shadow-lg border border-slate-200/60 mb-6">
            <div className="space-y-4 mb-6">
                <div className="flex items-start gap-3">
                    <Check className="w-5 h-5 text-green-500 mt-1 shrink-0" />
                    <p className="text-slate-700">Optimize your Google & Apple listings</p>
                </div>
                 <div className="flex items-start gap-3">
                    <Check className="w-5 h-5 text-green-500 mt-1 shrink-0" />
                    <p className="text-slate-700">Appear in AI-generated results (GEO)</p>
                </div>
                 <div className="flex items-start gap-3">
                    <Check className="w-5 h-5 text-green-500 mt-1 shrink-0" />
                    <p className="text-slate-700">Automate reviews & local SEO tasks</p>
                </div>
            </div>
            
            <Button
              size="lg"
              className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 mb-4"
              onClick={handleGoogleSignIn}
              disabled={isLoading}
            >
              {isLoading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <svg className="w-5 h-5 mr-2 -ml-1" viewBox="0 0 48 48">
                    <path fill="#FFC107" d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z"></path><path fill="#FF3D00" d="M6.306 14.691l6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691z"></path><path fill="#4CAF50" d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238C29.211 35.091 26.715 36 24 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z"></path><path fill="#1976D2" d="M43.611 20.083H42V20H24v8h11.303c-.792 2.237-2.231 4.166-4.087 5.571l6.19 5.238C44.438 36.338 48 30.651 48 24c0-1.341-.138-2.65-.389-3.917z"></path>
                </svg>
              )}
              Sign In with Google
            </Button>

            {/* Demo Button */}
            <Button
              variant="outline"
              size="lg"
              className="w-full"
              onClick={onStartDemo}
              disabled={isLoading}
            >
              Try Demo
            </Button>
          </div>

          <div className="text-center text-sm text-slate-500">
            No account?{' '}
            <Link to={createPageUrl('Pricing')} className="font-medium text-indigo-600 hover:text-indigo-800">
              Get Started
            </Link>
          </div>
        </div>
      </div>
    );
}