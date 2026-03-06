import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Building, ArrowRight, Sparkles } from 'lucide-react';
import { Business } from '@/api/entities';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';

export default function OnboardingModal({ user, onComplete }) {
  const [isOpen, setIsOpen] = useState(false);
  const [step, setStep] = useState(1);
  const [businessData, setBusinessData] = useState({
    name: '',
    city: '',
    state: '',
    category: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    // Check if user has seen onboarding and has no businesses
    const hasSeenOnboarding = localStorage.getItem('onboarding_completed');
    const checkBusinesses = async () => {
      try {
        const businesses = await Business.list();
        if (!hasSeenOnboarding && businesses.length === 0 && user) {
          setIsOpen(true);
        }
      } catch (error) {
        console.error('Error checking businesses:', error);
      }
    };
    
    checkBusinesses();
  }, [user]);

  const handleSkip = () => {
    localStorage.setItem('onboarding_completed', 'true');
    setIsOpen(false);
    if (onComplete) onComplete();
  };

  const handleAddBusiness = async () => {
    if (!businessData.name || !businessData.city || !businessData.state) {
      return;
    }

    setIsSubmitting(true);
    try {
      await Business.create({
        ...businessData,
        ownerId: user?.id || '1'
      });
      localStorage.setItem('onboarding_completed', 'true');
      setIsOpen(false);
      if (onComplete) onComplete();
      navigate(createPageUrl('Businesses'));
    } catch (error) {
      console.error('Error creating business:', error);
      alert('Failed to add business. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-[600px] bg-gradient-to-br from-white to-indigo-50/30">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            <div>
              <DialogTitle className="text-2xl">Welcome to AGS!</DialogTitle>
              <DialogDescription className="text-base">
                Let's get you set up in under 60 seconds
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Progress Steps */}
          <div className="flex items-center justify-center gap-2">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
              step >= 1 ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-500'
            }`}>
              1
            </div>
            <div className="w-16 h-1 bg-slate-200">
              <div className={`h-full transition-all ${step >= 2 ? 'w-full bg-indigo-600' : 'w-0'}`} />
            </div>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
              step >= 2 ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-500'
            }`}>
              2
            </div>
          </div>

          {step === 1 && (
            <div className="space-y-4">
              <div className="bg-white rounded-xl p-6 border-2 border-indigo-100">
                <div className="flex items-start gap-4">
                  <Building className="w-10 h-10 text-indigo-600 flex-shrink-0" />
                  <div>
                    <h3 className="font-bold text-lg text-slate-900 mb-2">Add Your First Business</h3>
                    <p className="text-slate-600 text-sm mb-4">
                      Connect your business to start tracking AI visibility, reviews, and local search performance.
                    </p>
                    <ul className="space-y-2 text-sm text-slate-600">
                      <li className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-indigo-600" />
                        Track AI mentions across ChatGPT, Perplexity & more
                      </li>
                      <li className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-indigo-600" />
                        Monitor Google Business Profile health
                      </li>
                      <li className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-indigo-600" />
                        Automate review requests & reputation management
                      </li>
                    </ul>
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <Button
                  onClick={() => setStep(2)}
                  className="flex-1 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 h-12 text-base"
                >
                  Add My Business
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
                <Button
                  onClick={handleSkip}
                  variant="outline"
                  className="border-slate-300"
                >
                  Skip for Now
                </Button>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <Label htmlFor="businessName">Business Name *</Label>
                  <Input
                    id="businessName"
                    placeholder="e.g., Joe's Pizza"
                    value={businessData.name}
                    onChange={(e) => setBusinessData({ ...businessData, name: e.target.value })}
                    className="h-12"
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="city">City *</Label>
                    <Input
                      id="city"
                      placeholder="Chicago"
                      value={businessData.city}
                      onChange={(e) => setBusinessData({ ...businessData, city: e.target.value })}
                      className="h-12"
                    />
                  </div>
                  <div>
                    <Label htmlFor="state">State *</Label>
                    <Input
                      id="state"
                      placeholder="IL"
                      value={businessData.state}
                      onChange={(e) => setBusinessData({ ...businessData, state: e.target.value })}
                      className="h-12"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="category">Category</Label>
                  <Input
                    id="category"
                    placeholder="e.g., Restaurant, HVAC, Dentist"
                    value={businessData.category}
                    onChange={(e) => setBusinessData({ ...businessData, category: e.target.value })}
                    className="h-12"
                  />
                </div>
              </div>

              <div className="flex gap-3">
                <Button
                  onClick={() => setStep(1)}
                  variant="outline"
                  className="border-slate-300"
                >
                  Back
                </Button>
                <Button
                  onClick={handleAddBusiness}
                  disabled={!businessData.name || !businessData.city || !businessData.state || isSubmitting}
                  className="flex-1 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 h-12 text-base"
                >
                  {isSubmitting ? 'Adding...' : 'Complete Setup'}
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}