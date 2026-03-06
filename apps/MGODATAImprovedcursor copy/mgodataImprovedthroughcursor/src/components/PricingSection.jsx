import React, { useState } from 'react';
import { Check, ArrowRight, HelpCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';

const PRICING_PLANS = [
  {
    id: 'intro',
    name: 'Intro',
    tagline: 'For single-location or local-only businesses',
    priceLabel: 'Launch Pricing TBD',
    badge: 'Most Popular',
    cta: 'Get Started',
    ctaVariant: 'gradient',
    features: [
      'Up to 5 local scans / month',
      'Local GEO + MEO optimization insights',
      'Basic AI visibility scanning',
      'Basic schema & FAQ recommendations',
      'Email report + shareable link',
      'Priority onboarding during beta'
    ],
    dark: false
  },
  {
    id: 'pro',
    name: 'Pro',
    tagline: 'For local + online brands, e-com, multi-location',
    priceLabel: 'Custom launch pricing',
    badge: 'For Growing Brands',
    cta: 'Talk to Sales',
    ctaVariant: 'outline',
    features: [
      'Local + Online Business visibility scans',
      'Unlimited scans during beta (fair use)',
      'Multi-location & multi-brand support',
      'AI + SEO + Social visibility scoring',
      'Online brand entity optimization',
      'API access & webhooks',
      'Team seats & permission controls',
      'Dedicated success manager'
    ],
    dark: false
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    tagline: 'For enterprises, agencies, franchises, SaaS',
    priceLabel: 'Enterprise Pricing',
    subtext: 'Custom per-organization quote',
    badge: 'Enterprise',
    cta: 'Contact Enterprise Team',
    ctaVariant: 'solid-white',
    features: [
      'Unlimited AI + SEO + Social scans',
      '24/7 priority support',
      'White-label report export',
      'Advanced API (batch scans, async jobs)',
      'Multi-team dashboard & analytics',
      'Custom integrations & onboarding',
      'Migration support',
      'Quarterly strategy sessions',
      'SLAs + compliance support'
    ],
    dark: true
  }
];

export default function PricingSection() {
  const navigate = useNavigate();
  const [isAnnual, setIsAnnual] = useState(true);

  const handleCTA = (plan) => {
    if (plan.id === 'intro') {
      navigate(createPageUrl('signin'));
    } else if (plan.id === 'pro') {
      window.location.href = 'mailto:info@atlasgrowths.com?subject=Pro Plan Inquiry';
    } else {
      window.location.href = 'mailto:info@atlasgrowths.com?subject=Enterprise Inquiry';
    }
  };

  return (
    <section className="py-24 bg-slate-50 relative overflow-hidden" id="pricing">
      {/* Subtle Background Gradients */}
      <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-purple-200 to-transparent opacity-50" />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-purple-100/40 rounded-full blur-[80px] -z-10 pointer-events-none" />

      <div className="max-w-7xl mx-auto px-6">
        {/* Header */}
        <div className="text-center mb-16 max-w-3xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <Badge variant="secondary" className="mb-6 bg-purple-100 text-purple-700 hover:bg-purple-200 px-4 py-1 text-xs font-bold uppercase tracking-wider border border-purple-200">
              Early Access Pricing
            </Badge>
            <h2 className="text-4xl md:text-5xl font-bold text-slate-900 mb-6 tracking-tight">
              Plans for every stage of growth
            </h2>
            <p className="text-xl text-slate-600 mb-10">
              From local businesses to global enterprises, choose the plan that grows with you.
            </p>

            {/* Monthly / Annual Toggle */}
            <div className="flex items-center justify-center gap-4 select-none">
              <span 
                className={cn("text-sm font-medium transition-colors cursor-pointer", !isAnnual ? "text-slate-900" : "text-slate-500")}
                onClick={() => setIsAnnual(false)}
              >
                Monthly
              </span>
              <button
                onClick={() => setIsAnnual(!isAnnual)}
                className="relative w-12 h-7 bg-slate-200 rounded-full p-1 transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2"
              >
                <motion.div
                  className="w-5 h-5 bg-white rounded-full shadow-sm"
                  animate={{ x: isAnnual ? 20 : 0 }}
                  transition={{ type: "spring", stiffness: 500, damping: 30 }}
                />
              </button>
              <span 
                className={cn("text-sm font-medium transition-colors cursor-pointer flex items-center gap-1.5", isAnnual ? "text-slate-900" : "text-slate-500")}
                onClick={() => setIsAnnual(true)}
              >
                Annual <span className="text-purple-600 font-bold text-[10px] bg-purple-50 px-1.5 py-0.5 rounded-full">2 months free</span>
              </span>
            </div>
          </motion.div>
        </div>

        {/* Pricing Cards Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          {PRICING_PLANS.map((plan, index) => (
            <motion.div
              key={plan.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1, duration: 0.5 }}
              className="h-full"
            >
              <Card 
                className={cn(
                  "h-full relative flex flex-col overflow-hidden border transition-all duration-300 hover:shadow-xl",
                  "rounded-[24px]",
                  plan.dark 
                    ? "bg-slate-900 border-slate-800 text-white ring-1 ring-slate-700" 
                    : "bg-white border-slate-200 text-slate-900 shadow-sm hover:border-purple-200"
                )}
              >
                {/* Top Highlight Line for Intro */}
                {plan.id === 'intro' && (
                  <div className="absolute top-0 left-0 right-0 h-1 bg-theme-gradient" />
                )}
                
                <CardContent className="p-8 flex-1 flex flex-col">
                  {/* Badge */}
                  <div className="mb-6 min-h-[28px]">
                    {plan.badge && (
                      <Badge 
                        className={cn(
                          "px-3 py-1 text-[11px] font-bold uppercase tracking-wider border-0",
                          plan.id === 'intro' ? "bg-purple-100 text-purple-700" :
                          plan.id === 'pro' ? "bg-slate-100 text-slate-600" :
                          "bg-amber-500/20 text-amber-400" // Enterprise
                        )}
                      >
                        {plan.badge}
                      </Badge>
                    )}
                  </div>

                  {/* Plan Title & Tagline */}
                  <div className="mb-8">
                    <h3 className={cn("text-2xl font-bold mb-2", plan.dark ? "text-white" : "text-slate-900")}>
                      {plan.name}
                    </h3>
                    <p className={cn("text-sm leading-relaxed min-h-[40px]", plan.dark ? "text-slate-400" : "text-slate-500")}>
                      {plan.tagline}
                    </p>
                  </div>

                  {/* Pricing Label */}
                  <div className="mb-8">
                    <div className={cn("text-2xl font-bold mb-1", plan.dark ? "text-white" : "text-slate-900")}>
                      {plan.priceLabel}
                    </div>
                    {plan.subtext && (
                      <div className={cn("text-xs font-medium", plan.dark ? "text-slate-500" : "text-slate-400")}>
                        {plan.subtext}
                      </div>
                    )}
                  </div>

                  {/* CTA Button */}
                  <div className="mb-8">
                    <Button
                      onClick={() => handleCTA(plan)}
                      className={cn(
                        "w-full h-12 rounded-xl font-semibold transition-all duration-200 text-sm",
                        plan.ctaVariant === 'gradient' && "bg-theme-gradient text-white shadow-lg hover:shadow-xl hover:-translate-y-0.5",
                        plan.ctaVariant === 'outline' && "bg-transparent border-2 border-slate-200 text-slate-700 hover:border-purple-600 hover:text-purple-700",
                        plan.ctaVariant === 'solid-white' && "bg-white text-slate-900 hover:bg-slate-100 shadow-lg"
                      )}
                    >
                      {plan.cta}
                      {plan.ctaVariant === 'gradient' && <ArrowRight className="ml-2 w-4 h-4" />}
                    </Button>
                  </div>

                  {/* Features List */}
                  <div className={cn("pt-8 border-t mt-auto", plan.dark ? "border-slate-800" : "border-slate-100")}>
                    <ul className="space-y-4">
                      {plan.features.map((feature, i) => (
                        <li key={i} className="flex items-start gap-3 text-sm">
                          <div className={cn(
                            "mt-0.5 rounded-full p-0.5 shrink-0 flex items-center justify-center w-5 h-5",
                            plan.dark ? "bg-slate-800 text-amber-400" : "bg-purple-50 text-purple-600"
                          )}>
                            <Check className="w-3 h-3" />
                          </div>
                          <span className={cn("leading-snug", plan.dark ? "text-slate-300" : "text-slate-600")}>
                            {feature}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Footer Text */}
        <div className="mt-16 text-center">
          <p className="text-slate-500 text-sm font-medium">
            Final pricing announced at full launch. Early-access users lock in discounted rates.
          </p>
        </div>
      </div>
    </section>
  );
}