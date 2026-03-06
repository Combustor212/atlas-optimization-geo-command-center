import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  CreditCard,
  Check,
  ArrowRight,
  ExternalLink,
  Loader2,
  Info,
  Calendar,
  DollarSign,
} from 'lucide-react';
import { toast } from 'sonner';
import { loadStripe } from '@stripe/stripe-js';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3002';

// Sample pricing plans (would typically come from backend config)
const PLANS = [
  {
    key: 'basic',
    name: 'Basic',
    price: '$49',
    period: 'month',
    features: [
      '10 location scans per month',
      'MEO & GEO scoring',
      'Basic insights',
      'Email support',
    ],
  },
  {
    key: 'pro',
    name: 'Professional',
    price: '$149',
    period: 'month',
    popular: true,
    features: [
      '50 location scans per month',
      'Advanced MEO & GEO insights',
      'Competitor tracking',
      'Priority support',
      'API access',
    ],
  },
  {
    key: 'elite',
    name: 'Elite',
    price: '$499',
    period: 'month',
    features: [
      'Unlimited location scans',
      'Full platform access',
      'White-label reports',
      'Dedicated account manager',
      'Custom integrations',
    ],
  },
];

export default function BillingPage({ user }) {
  const [loading, setLoading] = useState(false);
  const [subscription, setSubscription] = useState(null);
  const [loadingPortal, setLoadingPortal] = useState(false);

  useEffect(() => {
    if (user?.id) {
      loadSubscriptionStatus();
    }
  }, [user]);

  const loadSubscriptionStatus = async () => {
    try {
      const res = await fetch(
        `${BACKEND_URL}/api/stripe/subscription-status?user_id=${user.id}&tenant_id=default`,
        { headers: { 'Content-Type': 'application/json' } }
      );
      const data = await res.json();

      if (data.has_subscription) {
        setSubscription(data.subscription);
      }
    } catch (error) {
      console.error('Failed to load subscription status:', error);
    }
  };

  const handleUpgrade = async (planKey) => {
    if (!user?.id || !user?.email) {
      toast.error('Please sign in to upgrade');
      return;
    }

    setLoading(true);

    try {
      // Create checkout session
      const res = await fetch(`${BACKEND_URL}/api/stripe/create-checkout-session`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenant_id: 'default',
          user_id: user.id,
          email: user.email,
          plan_key: planKey,
          success_url: `${window.location.origin}/billing/success?session_id={CHECKOUT_SESSION_ID}`,
          cancel_url: `${window.location.origin}/billing`,
        }),
      });

      const data = await res.json();

      if (data.success && data.url) {
        // Redirect to Stripe Checkout
        window.location.href = data.url;
      } else {
        toast.error(data.message || 'Failed to create checkout session');
      }
    } catch (error) {
      toast.error('Failed to initiate checkout');
    } finally {
      setLoading(false);
    }
  };

  const handleManageBilling = async () => {
    if (!user?.id) {
      toast.error('Please sign in to manage billing');
      return;
    }

    setLoadingPortal(true);

    try {
      const res = await fetch(`${BACKEND_URL}/api/stripe/create-portal-session`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenant_id: 'default',
          user_id: user.id,
          return_url: `${window.location.origin}/billing`,
        }),
      });

      const data = await res.json();

      if (data.success && data.url) {
        // Redirect to Stripe Customer Portal
        window.location.href = data.url;
      } else {
        toast.error(data.message || 'Failed to open billing portal');
      }
    } catch (error) {
      toast.error('Failed to open billing portal');
    } finally {
      setLoadingPortal(false);
    }
  };

  const getStatusBadge = (status) => {
    const variants = {
      active: 'default',
      trialing: 'secondary',
      past_due: 'destructive',
      canceled: 'outline',
      incomplete: 'secondary',
    };

    return (
      <Badge variant={variants[status] || 'outline'}>
        {status?.replace('_', ' ').toUpperCase()}
      </Badge>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Billing & Subscription</h1>
          <p className="text-slate-600">Manage your AGS subscription and billing information</p>
        </div>

        {/* Current Subscription Status */}
        {subscription && (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Current Subscription</span>
                {getStatusBadge(subscription.status)}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <div className="text-sm text-muted-foreground mb-1">Plan</div>
                  <div className="text-lg font-semibold">{subscription.plan_name || 'Unknown Plan'}</div>
                </div>

                <div>
                  <div className="text-sm text-muted-foreground mb-1 flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    Current Period
                  </div>
                  <div className="text-sm">
                    {subscription.current_period_start && subscription.current_period_end && (
                      <>
                        {new Date(subscription.current_period_start).toLocaleDateString()} -{' '}
                        {new Date(subscription.current_period_end).toLocaleDateString()}
                      </>
                    )}
                  </div>
                </div>

                <div>
                  <div className="text-sm text-muted-foreground mb-1">Actions</div>
                  <Button onClick={handleManageBilling} variant="outline" disabled={loadingPortal}>
                    {loadingPortal ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <ExternalLink className="w-4 h-4 mr-2" />
                    )}
                    Manage Billing
                  </Button>
                </div>
              </div>

              {subscription.cancel_at_period_end === 1 && (
                <Alert className="mt-4">
                  <Info className="h-4 w-4" />
                  <AlertDescription>
                    Your subscription will be canceled at the end of the current billing period (
                    {new Date(subscription.current_period_end).toLocaleDateString()}).
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        )}

        {/* Pricing Plans */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-slate-900 mb-6">
            {subscription ? 'Upgrade Your Plan' : 'Choose Your Plan'}
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {PLANS.map((plan) => (
              <Card
                key={plan.key}
                className={`relative ${
                  plan.popular ? 'border-2 border-purple-500 shadow-lg' : ''
                }`}
              >
                {plan.popular && (
                  <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-to-r from-purple-600 to-indigo-600">
                    Most Popular
                  </Badge>
                )}

                <CardHeader>
                  <CardTitle className="text-xl">{plan.name}</CardTitle>
                  <CardDescription>
                    <div className="flex items-baseline mt-2">
                      <span className="text-3xl font-bold text-slate-900">{plan.price}</span>
                      <span className="text-slate-600 ml-2">/ {plan.period}</span>
                    </div>
                  </CardDescription>
                </CardHeader>

                <CardContent>
                  <ul className="space-y-3 mb-6">
                    {plan.features.map((feature, index) => (
                      <li key={index} className="flex items-start gap-2">
                        <Check className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                        <span className="text-sm text-slate-700">{feature}</span>
                      </li>
                    ))}
                  </ul>

                  <Button
                    onClick={() => handleUpgrade(plan.key)}
                    disabled={
                      loading ||
                      (subscription?.plan_key === plan.key && subscription?.status === 'active')
                    }
                    className={
                      plan.popular
                        ? 'w-full bg-gradient-to-r from-purple-600 to-indigo-600 text-white'
                        : 'w-full'
                    }
                    variant={plan.popular ? 'default' : 'outline'}
                  >
                    {loading ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : subscription?.plan_key === plan.key && subscription?.status === 'active' ? (
                      'Current Plan'
                    ) : (
                      <>
                        {subscription ? 'Upgrade' : 'Get Started'}
                        <ArrowRight className="w-4 h-4 ml-2" />
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Payment Methods & Billing History */}
        {subscription && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="w-5 h-5" />
                Payment & Billing
              </CardTitle>
              <CardDescription>
                Manage payment methods and view billing history in the Stripe Customer Portal
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={handleManageBilling} disabled={loadingPortal}>
                {loadingPortal ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <ExternalLink className="w-4 h-4 mr-2" />
                )}
                Open Billing Portal
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Security Notice */}
        <Alert className="mt-6">
          <Info className="h-4 w-4" />
          <AlertDescription>
            All payments are securely processed by Stripe. We never store your payment information.
          </AlertDescription>
        </Alert>
      </div>
    </div>
  );
}



