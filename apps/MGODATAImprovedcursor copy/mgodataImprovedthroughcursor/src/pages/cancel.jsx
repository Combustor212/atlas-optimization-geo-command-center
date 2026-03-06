
import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { X, Sparkles, ArrowLeft, MessageCircle, CreditCard } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import CompanyLogo from '../components/CompanyLogo'; // Added import for CompanyLogo

export default function CancelPage({ user }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50/30">
      {/* Simple Header */}
      <header className="flex h-16 shrink-0 items-center gap-4 border-b border-slate-200/60 bg-white/80 backdrop-blur-sm px-4 md:px-6 lg:h-[68px]">
        {/* Replaced old logo implementation with CompanyLogo component */}
        <CompanyLogo 
          linkTo="/"
          size="md"
        />
        <div className="flex-1" /> {/* This div pushes content to the right, keeping the logo on the far left */}
      </header>

      <div className="max-w-2xl mx-auto px-4 py-12">
        {/* Cancel Header */}
        <div className="text-center mb-12">
          <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <X className="w-8 h-8 text-orange-600" />
          </div>
          <h1 className="text-4xl font-bold text-slate-900 mb-4">
            Payment Canceled
          </h1>
          <p className="text-xl text-slate-600">
            No worries! Your payment was not processed.
          </p>
        </div>

        {/* Options */}
        <div className="space-y-6 mb-12">
          <Card className="bg-white/80 backdrop-blur-sm border-slate-200/60 shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-3">
                <CreditCard className="w-5 h-5 text-indigo-600" />
                Try Again
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-slate-600 mb-4">
                We're here to help you dominate local search.
              </p>
              <Button asChild className="w-full bg-indigo-600 hover:bg-indigo-700">
                <Link to={createPageUrl("pricing")}>
                  View Pricing Plans
                </Link>
              </Button>
            </CardContent>
          </Card>

          <Card className="bg-white/80 backdrop-blur-sm border-slate-200/60 shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-3">
                <MessageCircle className="w-5 h-5 text-green-600" />
                Have Questions?
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-slate-600 mb-4">
                Not sure which plan is right for you? We'd love to help you find the perfect fit.
              </p>
              <Button variant="outline" className="w-full">
                Contact Us
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Back to Homepage */}
        <div className="text-center">
          <Button variant="ghost" asChild>
            <Link to="/" className="flex items-center gap-2">
              <ArrowLeft className="w-4 h-4" />
              Back to Homepage
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
