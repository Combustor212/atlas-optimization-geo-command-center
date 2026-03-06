import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Check, Sparkles, Crown, Building2, Phone } from 'lucide-react';
import { Badge } from "@/components/ui/badge";
import { User } from '@/api/entities';

const PlanCard = ({ plan, isYearly, isPopular = false, onSelectPlan }) => {
    const monthlyPrice = plan.price.monthly;
    const yearlyPrice = Math.round(monthlyPrice * 0.8); // 20% discount
    const displayPrice = isYearly ? yearlyPrice : monthlyPrice;
    
    const handleSelectPlan = () => {
        if (plan.id === 'ENTERPRISE') {
            alert('Contacting sales team for Enterprise pricing...');
        } else {
            onSelectPlan(plan.id, isYearly);
        }
    };

    const getIcon = () => {
        switch(plan.id) {
            case 'BASIC': return <Sparkles className="w-6 h-6 text-blue-600" />;
            case 'PRO': return <Crown className="w-6 h-6 text-purple-600" />;
            case 'ELITE': return <Building2 className="w-6 h-6 text-indigo-600" />;
            case 'ENTERPRISE': return <Phone className="w-6 h-6 text-slate-600" />;
            default: return <Sparkles className="w-6 h-6 text-blue-600" />;
        }
    };

    const isProPlan = plan.id === 'PRO';

    return (
        <div className={`relative bg-white border-2 rounded-3xl p-8 shadow-lg hover:shadow-xl transition-all duration-300 ${
            isPopular ? 'border-purple-300 ring-4 ring-purple-100 scale-105' : 'border-slate-200 hover:border-slate-300'
        }`}>
            {isPopular && (
                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                    <Badge className="bg-gradient-to-r from-purple-600 to-purple-700 text-white px-6 py-2 text-sm font-bold rounded-full shadow-lg">
                        Most Popular
                    </Badge>
                </div>
            )}
            
            <div className="text-center">
                <div className="flex items-center justify-center gap-3 mb-4">
                    {getIcon()}
                    <h3 className="text-2xl font-bold text-slate-900">{plan.name}</h3>
                </div>
                <p className="text-slate-600 text-base mb-8 min-h-[3rem] flex items-center justify-center">{plan.tagline}</p>
                
                <div className="mb-8">
                    {plan.id === 'ENTERPRISE' ? (
                        <div>
                            <div className="text-4xl font-bold text-slate-900 mb-2">Custom</div>
                            <p className="text-slate-500">Let's talk pricing</p>
                        </div>
                    ) : (
                        <div>
                            <div className="flex items-baseline justify-center gap-2 mb-3">
                                <span className="text-5xl font-bold text-slate-900">${displayPrice}</span>
                                <span className="text-xl text-slate-500">/mo</span>
                            </div>
                            {isYearly && (
                                <p className="text-green-600 font-semibold">
                                    Save ${monthlyPrice - yearlyPrice}/mo
                                </p>
                            )}
                            {isProPlan && (
                                <p className="text-purple-600 font-medium text-sm mt-2">
                                    $0.99 for 14 days, then ${displayPrice}/mo
                                </p>
                            )}
                        </div>
                    )}
                </div>
                
                <Button 
                    onClick={handleSelectPlan}
                    className={`w-full mb-8 py-4 text-lg font-semibold rounded-xl ${
                        isPopular 
                            ? 'bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white shadow-lg transform hover:scale-105' 
                            : plan.id === 'ENTERPRISE'
                            ? 'bg-slate-900 hover:bg-slate-800 text-white'
                            : 'bg-slate-900 hover:bg-slate-800 text-white'
                    } transition-all duration-200`}
                >
                    {plan.id === 'ENTERPRISE' ? 'Contact Sales' : 'Get Started'}
                </Button>
            </div>
            
            <div className="space-y-4">
                <div className="border-t border-slate-200 pt-6">
                    <ul className="space-y-4">
                        {plan.features.map((feature, i) => (
                            <li key={i} className="flex items-start gap-3">
                                <Check className="w-5 h-5 text-green-500 mt-0.5 shrink-0" />
                                <span className="text-slate-700">{feature}</span>
                            </li>
                        ))}
                    </ul>
                </div>
            </div>
        </div>
    );
};

const plans = [
    {
        id: 'BASIC',
        name: 'Basic',
        tagline: 'For individuals and small teams starting out',
        price: { monthly: 99 },
        features: [
            'GEO prompts & AI visibility checks',
            'MEO tune-up & optimization',
            'Automated review requests',
            'Live metrics dashboard',
            '1 business location',
        ],
    },
    {
        id: 'PRO',
        name: 'Pro',
        tagline: 'For growing businesses that need more power',
        price: { monthly: 499 },
        popular: true,
        features: [
            'Everything in Basic',
            'Weekly posts & content creation',
            'Automated photo cadence',
            'Priority support',
            'PDF monthly reports',
            'Up to 5 business locations',
        ],
    },
    {
        id: 'ELITE',
        name: 'Elite',
        tagline: 'For agencies and brands that want it all',
        price: { monthly: 999 },
        features: [
            'Everything in Pro',
            'AI concierge agent',
            'Advanced analytics & insights',
            'Dedicated account manager',
            'Custom playbooks & scripts',
            'Up to 10+ business locations',
        ],
    },
    {
        id: 'ENTERPRISE',
        name: 'Enterprise',
        tagline: 'For franchises and enterprise rollouts',
        price: { monthly: 0 }, // Custom pricing
        features: [
            'Everything in Elite',
            'Unlimited business locations',
            'White-label options',
            'Custom integrations & API',
            'Dedicated success manager',
            'SLA & enterprise support',
        ],
    },
];

export default function PlanSelection({ onPlanSelected }) {
    const [isYearly, setIsYearly] = useState(false);

    const handleSelectPlan = async (planId, isYearly) => {
        try {
            // Update user's plan
            await User.updateMyUserData({ 
                plan: planId,
                subscriptionStatus: 'active'
            });
            
            // Simulate Stripe checkout
            if (planId === 'PRO') {
                alert(`Redirecting to Stripe for Pro: $${isYearly ? '399' : '499'}/mo`);
            } else {
                const price = plans.find(p => p.id === planId)?.price.monthly;
                const finalPrice = isYearly ? Math.round(price * 0.8) : price;
                alert(`Redirecting to Stripe for ${planId}: $${finalPrice}/mo`);
            }
            
            // Call the callback to indicate plan was selected
            onPlanSelected();
        } catch (error) {
            console.error('Error selecting plan:', error);
            alert('There was an error selecting your plan. Please try again.');
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-purple-50/30 to-blue-50/30 flex items-center justify-center p-4 overflow-y-auto">
            <div className="max-w-7xl mx-auto w-full py-12">
                {/* Header Section */}
                <div className="text-center mb-16">
                    <h1 className="text-5xl lg:text-7xl font-bold tracking-tight text-slate-900 mb-6">
                        Own the Future of Visibility
                    </h1>
                    <p className="text-xl lg:text-2xl text-slate-600 max-w-3xl mx-auto">
                        Choose your plan and start growing with AI-driven GEO + MEO.
                    </p>
                </div>

                {/* Billing Toggle */}
                <div className="flex items-center justify-center gap-6 mb-16">
                    <span className={`text-lg font-medium ${!isYearly ? 'text-slate-900' : 'text-slate-500'}`}>
                        Monthly
                    </span>
                    <Switch 
                        checked={isYearly} 
                        onCheckedChange={setIsYearly}
                        className="data-[state=checked]:bg-purple-600 scale-125"
                    />
                    <span className={`text-lg font-medium ${isYearly ? 'text-slate-900' : 'text-slate-500'}`}>
                        Yearly
                    </span>
                    <Badge variant="secondary" className="bg-green-100 text-green-700 border-green-200 px-3 py-1">
                        Save 20%
                    </Badge>
                </div>

                {/* Pricing Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl mx-auto">
                    {plans.map(plan => (
                        <PlanCard 
                            key={plan.name} 
                            plan={plan} 
                            isYearly={isYearly} 
                            isPopular={plan.popular}
                            onSelectPlan={handleSelectPlan}
                        />
                    ))}
                </div>
                
                {/* Trust Signals */}
                <div className="text-center text-slate-500 flex items-center justify-center gap-8 flex-wrap mt-16">
                    <div className="flex items-center gap-2">
                        <Check className="w-5 h-5 text-green-500" />
                        <span>14-day money back guarantee</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <Check className="w-5 h-5 text-green-500" />
                        <span>Cancel anytime</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <Check className="w-5 h-5 text-green-500" />
                        <span>Secure payments by Stripe</span>
                    </div>
                </div>
            </div>
        </div>
    );
}