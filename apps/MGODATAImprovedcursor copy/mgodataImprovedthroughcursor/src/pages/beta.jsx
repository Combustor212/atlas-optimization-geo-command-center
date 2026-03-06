import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Check, Mail, Loader2, ArrowLeft, Sparkles, Rocket, Users, Gem, ArrowRight, MapPin, Globe, Building, Clipboard, Smartphone } from 'lucide-react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import BetaLayout from '../components/BetaLayout';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// Global country list
const COUNTRIES = [
  "United States", "Canada", "United Kingdom", "Australia", "Germany", "France", 
  "Spain", "Italy", "Netherlands", "Belgium", "Switzerland", "Austria", 
  "Sweden", "Norway", "Denmark", "Finland", "Ireland", "Portugal", "Poland",
  "Japan", "South Korea", "Singapore", "Hong Kong", "Taiwan", "China",
  "India", "United Arab Emirates", "Saudi Arabia", "Israel", "Turkey",
  "Brazil", "Mexico", "Argentina", "Chile", "Colombia",
  "South Africa", "Nigeria", "Kenya", "Egypt",
  "New Zealand", "Philippines", "Thailand", "Malaysia", "Indonesia", "Vietnam"
].sort();

export default function BetaWaitlistPage() {
  const [formData, setFormData] = useState({
    email: '',
    businessName: '',
    cityOrRegion: '',
    country: '',
    postalCode: ''
  });
  const [remaining, setRemaining] = useState(293);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasJoined, setHasJoined] = useState(false);
  const [isDuplicate, setIsDuplicate] = useState(false);
  const [error, setError] = useState('');
  const [isEmailValid, setIsEmailValid] = useState(false);

  // Fetch remaining spots on load
  useEffect(() => {
    const fetchRemaining = async () => {
      try {
        const res = await fetch('/functions/betaRemaining', { cache: 'no-store' });
        const json = await res.json();
        if (Number.isFinite(json.remaining)) {
          setRemaining(json.remaining);
        }
      } catch (err) {
        console.warn('Failed to fetch remaining:', err);
      }
    };
    fetchRemaining();

    // Optional: Simulate spots decreasing for social proof (every 3-5 min)
    const interval = setInterval(() => {
      setRemaining(prev => Math.max(0, prev - Math.floor(Math.random() * 2)));
    }, 180000 + Math.random() * 120000); // 3-5 minutes

    return () => clearInterval(interval);
  }, []);

  // Email validation
  useEffect(() => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    setIsEmailValid(emailRegex.test(formData.email));
  }, [formData.email]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Validate email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      setError('Please enter a valid email address');
      return;
    }

    if (!formData.businessName.trim()) {
      setError('Please enter your business name');
      return;
    }

    if (!formData.country) {
      setError('Please select your country');
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await fetch('/functions/betaJoin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          email: formData.email.toLowerCase().trim(),
          businessName: formData.businessName.trim(),
          cityOrRegion: formData.cityOrRegion.trim(),
          country: formData.country,
          postalCode: formData.postalCode.trim()
        })
      });

      const data = await res.json();

      if (data.ok && data.already) {
        setIsDuplicate(true);
        setHasJoined(true);
        toast.info('Already on waitlist');
        if (data.remaining !== undefined) {
          setRemaining(data.remaining);
        }
      } else if (data.ok) {
        setIsDuplicate(false);
        setHasJoined(true);
        toast.success('Welcome to the waitlist!');
        if (data.remaining !== undefined) {
          setRemaining(data.remaining);
        }
      } else if (data.reason === 'sold_out') {
        setError('The beta is full. Join our newsletter to be notified at launch.');
      } else if (data.reason === 'rate_limit') {
        setError('Too many attempts. Please try again in a few minutes.');
      } else {
        setError(data.message || 'Something went wrong. Please try again in a moment.');
      }
    } catch (err) {
      console.error('Join error:', err);
      setError('Something went wrong. Please try again in a moment.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const isFormLocked = !isEmailValid;

  // Duplicate state
  if (hasJoined && isDuplicate) {
    return (
      <BetaLayout>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="max-w-2xl mx-auto"
        >
          <div className="w-20 h-20 mx-auto mb-8 bg-gradient-to-br from-blue-400 to-indigo-500 rounded-full flex items-center justify-center shadow-xl">
            <Mail className="w-10 h-10 text-white" />
          </div>

          <h1 className="text-5xl md:text-6xl font-bold text-slate-900 mb-6 leading-tight">
            You have already applied for the waitlist, thank you for your support.
          </h1>
          
          <p className="text-xl text-slate-600 mb-12">
            We'll email you when your beta access is unlocked.
          </p>

          <Link to="/">
            <Button variant="outline" className="border-slate-300 hover:bg-slate-50 px-8 py-3 text-base font-semibold">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Home
            </Button>
          </Link>
        </motion.div>
      </BetaLayout>
    );
  }

  // Success state
  if (hasJoined && !isDuplicate) {
    return (
      <BetaLayout>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="max-w-2xl mx-auto"
        >
          <div className="w-20 h-20 mx-auto mb-8 bg-gradient-to-br from-green-400 to-emerald-500 rounded-full flex items-center justify-center shadow-xl">
            <Check className="w-10 h-10 text-white" />
          </div>

          <h1 className="text-5xl md:text-6xl font-bold text-slate-900 mb-6 leading-tight">
            Thanks for joining the waitlist of the best companies.
          </h1>
          
          <p className="text-xl text-slate-600 mb-12">
            We'll email you when your beta access is unlocked. Share with a colleague to help them grab a spot.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
            <Button
              onClick={() => {
                navigator.clipboard.writeText('https://atlasgrowths.com/beta');
                toast.success('Link copied to clipboard!');
              }}
              className="bg-theme-gradient text-white px-8 py-3 text-base font-semibold shadow-lg"
            >
              <><Clipboard className="w-4 h-4 mr-2" />Copy Invite Link</>
            </Button>
            
            <Button
              variant="outline"
              asChild
              className="border-slate-300 hover:bg-slate-50 px-8 py-3 text-base font-semibold"
            >
              <a href="https://www.linkedin.com/company/ags" target="_blank" rel="noopener noreferrer">
                <><Smartphone className="w-4 h-4 mr-2" />Follow Our Progress</>
              </a>
            </Button>
          </div>

          <Link to="/">
            <Button variant="ghost" className="text-slate-600 hover:text-slate-900">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Home
            </Button>
          </Link>
        </motion.div>
      </BetaLayout>
    );
  }

  // Main form state
  return (
    <BetaLayout>
      {/* Hero Section with Enhanced Visuals */}
      <div className="relative min-h-[85vh] flex items-center justify-center py-12">
        {/* Background Gradient Glow */}
        <div 
          className="absolute inset-0 pointer-events-none overflow-hidden"
          style={{
            background: 'radial-gradient(circle at 50% 0%, rgba(139,92,246,0.08), transparent 70%)'
          }}
        />
        
        {/* Abstract Gradient Blob */}
        <div 
          className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] pointer-events-none opacity-10 blur-3xl"
          style={{
            background: 'linear-gradient(135deg, rgba(139,92,246,0.4), rgba(59,130,246,0.4))',
            borderRadius: '50%'
          }}
        />

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="relative z-10 max-w-3xl mx-auto px-4"
        >
          {/* Enhanced Purple Badge */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2, duration: 0.5 }}
            className="mb-8"
          >
            <Badge className="bg-gradient-to-r from-[#E0E7FF] to-[#C7D2FE] text-purple-700 border-0 px-6 py-3 text-base font-bold backdrop-blur-sm shadow-lg">
              <Sparkles className="w-5 h-5 inline mr-2" />
              GLOBAL EARLY ACCESS BETA
            </Badge>
          </motion.div>

          {/* Enhanced Title */}
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.6 }}
            className="text-[46px] sm:text-[52px] lg:text-[80px] font-bold text-[#0F172A] mb-6 leading-[1.1]"
          >
            Join the AGS
            <br />
            Private Beta
          </motion.h1>

          {/* Subheadline */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.6 }}
            className="text-lg md:text-xl text-[#4B5563] max-w-[640px] mx-auto mb-4 leading-relaxed"
          >
            We're selecting 300 forward-thinking businesses worldwide for early access to AI-powered visibility.
          </motion.p>

          {/* Value Statement Line */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.6 }}
            className="text-base md:text-lg text-[#334155] max-w-[600px] mx-auto mb-10 font-medium"
          >
            Be among the first to shape how businesses appear in AI search globally.
          </motion.p>

          {/* Live Counter Badge - Closer to Form */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.6, duration: 0.5 }}
            className="mb-8"
          >
            <div className="inline-flex items-center gap-3 px-6 py-3 bg-gradient-to-r from-[#FDE68A] to-[#FBBF24] rounded-full shadow-md">
              <span className="text-xl font-bold text-black">
                {remaining} / 300 spots remaining
              </span>
            </div>
          </motion.div>

          {/* Enhanced Form Card */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7, duration: 0.6 }}
          >
            <Card 
              className="max-w-[540px] mx-auto bg-white/95 backdrop-blur-sm border-0 mb-6"
              style={{
                borderRadius: '28px',
                boxShadow: '0 4px 32px rgba(139,92,246,0.08), 0 0 0 1px rgba(139,92,246,0.05)'
              }}
            >
              <CardContent className="p-8 md:p-10">
                <form onSubmit={handleSubmit} className="space-y-5">
                  {/* Email Field */}
                  <div>
                    <label htmlFor="email" className="block text-sm font-semibold text-slate-700 mb-2 text-left">
                      <Mail className="w-4 h-4 inline mr-1" />
                      Your Email *
                    </label>
                    <div className="relative">
                      <Input
                        id="email"
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        placeholder="email@example.com"
                        className={cn(
                          "h-12 text-base transition-all shadow-sm hover:shadow-md border-2 rounded-xl",
                          isEmailValid ? "border-green-500 bg-green-50/30" : "border-[#E5E7EB] focus:border-[#8B5CF6] focus:ring-[#8B5CF6]"
                        )}
                        required
                      />
                      {isEmailValid && (
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          className="absolute right-3 top-1/2 -translate-y-1/2"
                        >
                          <div className="w-6 h-6 rounded-full bg-green-500 flex items-center justify-center">
                            <Check className="w-4 h-4 text-white" />
                          </div>
                        </motion.div>
                      )}
                    </div>
                    <p className={cn(
                      "text-xs mt-2 transition-all text-left",
                      isEmailValid ? "text-green-600 font-medium" : "text-slate-500"
                    )}>
                      {isEmailValid ? (
                        <>
                          <Check className="w-3 h-3 inline mr-1" />
                          Form unlocked! Complete your details below.
                        </>
                      ) : (
                        "Instant insights. No credit card required."
                      )}
                    </p>
                  </div>

                  {/* Business Name */}
                  <div>
                    <label htmlFor="businessName" className="block text-sm font-semibold text-slate-700 mb-2 text-left">
                      <Building className="w-4 h-4 inline mr-1" />
                      Business Name *
                    </label>
                    <Input
                      id="businessName"
                      type="text"
                      value={formData.businessName}
                      onChange={(e) => setFormData({ ...formData, businessName: e.target.value })}
                      placeholder="e.g., Sakura Dental Clinic"
                      className="h-12 text-base border-[#E5E7EB] focus:border-[#8B5CF6] focus:ring-[#8B5CF6] shadow-sm hover:shadow-md transition-all rounded-xl"
                      disabled={isFormLocked}
                      required
                    />
                  </div>

                  {/* City / Region */}
                  <div>
                    <label htmlFor="cityOrRegion" className="block text-sm font-semibold text-slate-700 mb-2 text-left">
                      <MapPin className="w-4 h-4 inline mr-1" />
                      City / Region
                    </label>
                    <Input
                      id="cityOrRegion"
                      type="text"
                      value={formData.cityOrRegion}
                      onChange={(e) => setFormData({ ...formData, cityOrRegion: e.target.value })}
                      placeholder="e.g., Dubai"
                      className="h-12 text-base border-[#E5E7EB] focus:border-[#8B5CF6] focus:ring-[#8B5CF6] shadow-sm hover:shadow-md transition-all rounded-xl"
                      disabled={isFormLocked}
                    />
                  </div>

                  {/* Country Dropdown */}
                  <div>
                    <label htmlFor="country" className="block text-sm font-semibold text-slate-700 mb-2 text-left">
                      <Globe className="w-4 h-4 inline mr-1" />
                      Country *
                    </label>
                    <Select
                      value={formData.country}
                      onValueChange={(value) => setFormData({ ...formData, country: value })}
                      disabled={isFormLocked}
                    >
                      <SelectTrigger className="h-12 text-base border-[#E5E7EB] focus:border-[#8B5CF6] focus:ring-[#8B5CF6] shadow-sm hover:shadow-md transition-all rounded-xl">
                        <SelectValue placeholder="Select your country" />
                      </SelectTrigger>
                      <SelectContent className="max-h-[300px]">
                        {COUNTRIES.map((country) => (
                          <SelectItem key={country} value={country}>
                            {country}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Postal Code (Optional) */}
                  <div>
                    <label htmlFor="postalCode" className="block text-sm font-semibold text-slate-700 mb-2 text-left">
                      Postal Code <span className="text-slate-400 font-normal">(optional)</span>
                    </label>
                    <Input
                      id="postalCode"
                      type="text"
                      value={formData.postalCode}
                      onChange={(e) => setFormData({ ...formData, postalCode: e.target.value })}
                      placeholder="e.g., 10117"
                      className="h-12 text-base border-[#E5E7EB] focus:border-[#8B5CF6] focus:ring-[#8B5CF6] shadow-sm hover:shadow-md transition-all rounded-xl"
                      disabled={isFormLocked}
                    />
                  </div>

                  {error && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="text-sm text-red-600 text-left bg-red-50 p-3 rounded-lg"
                    >
                      {error}
                    </motion.div>
                  )}

                  <Button
                    type="submit"
                    disabled={isSubmitting || isFormLocked}
                    className="w-full h-14 bg-gradient-to-r from-[#8B5CF6] to-[#3B82F6] hover:brightness-105 text-white text-base font-bold shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    style={{ borderRadius: '12px' }}
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                        Claiming Your Spot...
                      </>
                    ) : isFormLocked ? (
                      'Enter Email to Unlock'
                    ) : (
                      'Join Global Beta Access'
                    )}
                  </Button>

                  <p className="text-xs text-slate-500 text-center">
                    We'll send your confirmation instantly.
                  </p>
                </form>
              </CardContent>
            </Card>
          </motion.div>

          {/* Social Proof - Moved Closer to Form */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8, duration: 0.6 }}
            className="mt-6 mb-12"
          >
            <p className="text-sm text-slate-600 mb-4 font-medium">
              Trusted by 100+ businesses worldwide optimizing their online visibility daily.
            </p>
            
            <div className="flex items-center justify-center gap-8 flex-wrap opacity-60 hover:opacity-80 transition-opacity">
              <div className="text-xl font-bold text-slate-400">Google</div>
              <div className="text-xl font-bold text-slate-400">Apple Maps</div>
              <div className="text-xl font-bold text-slate-400">Yelp</div>
              <div className="text-xl font-bold text-slate-400">ChatGPT</div>
            </div>
          </motion.div>
        </motion.div>
      </div>

      {/* Benefits Section - Polished */}
      <div className="py-20 bg-gradient-to-b from-white to-slate-50/50">
        <div className="max-w-5xl mx-auto px-4">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="text-3xl md:text-4xl font-bold text-slate-900 text-center mb-12"
          >
            Why Join the Beta
          </motion.h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1, duration: 0.5 }}
              whileHover={{ y: -6, boxShadow: '0 12px 40px rgba(139,92,246,0.12)' }}
              className="bg-white p-8 rounded-2xl shadow-md hover:shadow-xl transition-all"
              style={{
                border: '1px solid rgba(139,92,246,0.1)'
              }}
            >
              <div 
                className="w-14 h-14 bg-gradient-to-br from-purple-100 to-indigo-100 rounded-xl flex items-center justify-center mb-5"
                style={{
                  boxShadow: '0 4px 16px rgba(139,92,246,0.15)'
                }}
              >
                <Rocket className="w-7 h-7 text-purple-600" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-3">Early Access Tools</h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                Try AI-powered MEO/GEO scanning first.
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2, duration: 0.5 }}
              whileHover={{ y: -6, boxShadow: '0 12px 40px rgba(59,130,246,0.12)' }}
              className="bg-white p-8 rounded-2xl shadow-md hover:shadow-xl transition-all"
              style={{
                border: '1px solid rgba(59,130,246,0.1)'
              }}
            >
              <div 
                className="w-14 h-14 bg-gradient-to-br from-blue-100 to-cyan-100 rounded-xl flex items-center justify-center mb-5"
                style={{
                  boxShadow: '0 4px 16px rgba(59,130,246,0.15)'
                }}
              >
                <Users className="w-7 h-7 text-blue-600" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-3">Priority Onboarding</h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                Direct support from the AGS team.
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.3, duration: 0.5 }}
              whileHover={{ y: -6, boxShadow: '0 12px 40px rgba(245,158,11,0.12)' }}
              className="bg-white p-8 rounded-2xl shadow-md hover:shadow-xl transition-all"
              style={{
                border: '1px solid rgba(245,158,11,0.1)'
              }}
            >
              <div 
                className="w-14 h-14 bg-gradient-to-br from-amber-100 to-orange-100 rounded-xl flex items-center justify-center mb-5"
                style={{
                  boxShadow: '0 4px 16px rgba(245,158,11,0.15)'
                }}
              >
                <Gem className="w-7 h-7 text-amber-600" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-3">Beta Pricing Lock</h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                Keep lifetime discounted pricing post-launch.
              </p>
            </motion.div>
          </div>
        </div>
      </div>

      {/* Secondary CTA Strip */}
      <div 
        className="relative py-16 overflow-hidden"
        style={{
          background: 'linear-gradient(135deg, #8B5CF6, #3B82F6)'
        }}
      >
        {/* Curved Top Edge */}
        <div 
          className="absolute top-0 left-0 right-0 h-12 bg-gradient-to-b from-slate-50/50 to-transparent"
          style={{
            clipPath: 'ellipse(100% 100% at 50% 0%)'
          }}
        />

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="relative z-10 max-w-4xl mx-auto px-4 text-center"
        >
          <p className="text-xl md:text-2xl text-white font-semibold mb-6">
            Not ready yet?
          </p>
          <Link to="/">
            <Button
              variant="outline"
              className="bg-white text-purple-600 border-0 hover:bg-slate-50 px-8 py-6 text-lg font-bold shadow-lg"
            >
              Run a Free AGS Scan
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
          </Link>
        </motion.div>
      </div>
    </BetaLayout>
  );
}