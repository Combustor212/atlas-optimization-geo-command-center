/**
 * Premium SaaS-style Book a Call modal with 4-step guided flow:
 * 1. Choose Date & Time
 * 2. Business Questions
 * 3. Confirm (contact details)
 * 4. Visibility Opportunity Estimate
 */
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Calendar, Clock, Loader2, Check, ChevronRight, ChevronLeft } from 'lucide-react';
import { BookingCalendar } from '@/components/booking/BookingCalendar';
import { BusinessSearchInput } from '@/components/booking/BusinessSearchInput';
import { getBookingApiUrl } from '@/config/api';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { calculateOpportunity } from '@/utils/bookingOpportunity';

const STEPS = [
  { id: 1, label: 'Date & Time' },
  { id: 2, label: 'Business Questions' },
  { id: 3, label: 'Confirm' },
  { id: 4, label: 'Opportunity Estimate' },
];

const BUSINESS_QUESTIONS = [
  {
    key: 'monthlyRevenue',
    label: 'What is your approximate monthly revenue?',
    options: ['Under $10k', '$10k–$50k', '$50k–$100k', '$100k–$500k', '$500k+'],
  },
  {
    key: 'averageCustomerValue',
    label: 'What is the average value of a new customer?',
    options: ['Under $50', '$50–$200', '$200–$1,000', '$1,000–$5,000', '$5,000+'],
  },
  {
    key: 'monthlyNewCustomers',
    label: 'How many new customers do you typically get per month?',
    options: ['1–10', '10–25', '25–50', '50–100', '100+'],
  },
  {
    key: 'mainCustomerSource',
    label: 'Where do most of your customers currently come from?',
    options: ['Google / Maps', 'Word of mouth', 'Paid ads', 'Social media', 'Website / SEO', 'Not sure'],
  },
  {
    key: 'marketingInvestment',
    label: 'Do you currently invest in marketing?',
    options: ['None', 'Under $1k/month', '$1k–$5k/month', '$5k–$20k/month', '$20k+'],
  },
  {
    key: 'mainGrowthGoal',
    label: 'What is your main goal right now?',
    options: ['Get more customers', 'Increase online visibility', 'Improve reviews', 'Expand locations', 'Increase revenue'],
  },
];

function formatSlotTime(isoStr) {
  const d = new Date(isoStr);
  return d.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    timeZone: 'America/New_York',
  });
}

function formatSelectedDate(dateStr) {
  if (!dateStr) return null;
  const d = new Date(dateStr + 'T12:00:00');
  return d.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

function groupSlotsByPeriod(slotList) {
  const am = [];
  const pm = [];
  slotList.forEach((slot) => {
    const d = new Date(slot.start);
    const hourStr = d.toLocaleString('en-US', {
      timeZone: 'America/New_York',
      hour: 'numeric',
      hour12: false,
    });
    const hour = parseInt(hourStr, 10) || 0;
    (hour < 12 ? am : pm).push(slot);
  });
  return { am, pm };
}

export function BookACallModal({ isOpen, onClose, geoScore: geoScoreProp }) {
  const [step, setStep] = useState(1);
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [slots, setSlots] = useState([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [useFallbackForm, setUseFallbackForm] = useState(false);
  const [bookingSuccess, setBookingSuccess] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [qualificationAnswers, setQualificationAnswers] = useState({});
  const [opportunity, setOpportunity] = useState(null);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    business: '',
    businessPlaceId: '',
    message: '',
    preferredDate: '',
    preferredTime: '',
  });

  const geoScore = geoScoreProp ?? null;
  const hasScanData = geoScore != null && typeof geoScore === 'number';

  const parseJsonOrNull = async (res) => {
    const text = await res.text();
    try {
      return text ? JSON.parse(text) : null;
    } catch {
      return null;
    }
  };

  const fetchSlots = async (dateStr) => {
    setLoadingSlots(true);
    try {
      const res = await fetch(getBookingApiUrl(`/api/booking/slots?date=${dateStr}`));
      const data = await parseJsonOrNull(res);
      // Only use API slots - never fall back to unfiltered demo slots. The API filters out
      // past slots and booked slots; demo slots would show unavailable times.
      const apiSlots = Array.isArray(data?.slots) ? data.slots : [];
      setSlots(apiSlots);
    } catch (err) {
      // API failed - show no slots rather than unfiltered times that may be taken
      setSlots([]);
    } finally {
      setLoadingSlots(false);
    }
  };

  const handleDateSelect = (dateStr) => {
    setSelectedDate(dateStr);
    setSelectedSlot(null);
    fetchSlots(dateStr);
  };

  const handleReset = () => {
    setStep(1);
    setSelectedDate('');
    setSelectedSlot(null);
    setSlots([]);
    setQualificationAnswers({});
    setOpportunity(null);
    setFormData({ name: '', email: '', phone: '', business: '', businessPlaceId: '', message: '', preferredDate: '', preferredTime: '' });
    setBookingSuccess(null);
    setUseFallbackForm(false);
    onClose();
  };

  const allQuestionsAnswered = BUSINESS_QUESTIONS.every(
    (q) => qualificationAnswers[q.key]
  );

  const canProceedFromStep1 = selectedSlot != null;
  const canProceedFromStep2 = allQuestionsAnswered;
  const canProceedFromStep3 =
    formData.name?.trim() && formData.email?.trim() && formData.phone?.trim();
  const canProceedFromStep4 = true; // Opportunity step is view-only

  useEffect(() => {
    if (hasScanData && step === 4 && allQuestionsAnswered) {
      setOpportunity(
        calculateOpportunity({ geoScore, qualificationAnswers })
      );
    }
  }, [hasScanData, step, qualificationAnswers, geoScore, allQuestionsAnswered]);

  const handleSchedule = async (e) => {
    e?.preventDefault();
    if (useFallbackForm) return handleFallbackSubmit(e);
    if (!selectedSlot || !canProceedFromStep4) return;

    setIsSubmitting(true);
    try {
      // Re-fetch slots right before submit to ensure selected slot is still available.
      // This prevents showing "no longer available" when another user took it.
      if (selectedDate) {
        const res = await fetch(getBookingApiUrl(`/api/booking/slots?date=${selectedDate}`));
        const fresh = await parseJsonOrNull(res);
        const freshSlots = fresh?.slots ?? [];
        const stillAvailable = freshSlots.some(
          (s) => s.start === selectedSlot.start && s.end === selectedSlot.end
        );
        if (!stillAvailable) {
          setSlots(freshSlots);
          setSelectedSlot(null);
          setStep(1);
          toast.info('Availability was updated. Please select a time again.');
          return;
        }
      }

      const res = await fetch(getBookingApiUrl('/api/booking/schedule'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name.trim(),
          email: formData.email.trim(),
          phone: formData.phone.trim(),
          business: formData.business?.trim() || undefined,
          message: formData.message?.trim() || undefined,
          slotStart: selectedSlot.start,
          slotEnd: selectedSlot.end,
          qualificationAnswers,
          opportunityEstimate: opportunity,
          businessPlaceId: formData.businessPlaceId || undefined,
        }),
      });
      const data = await parseJsonOrNull(res);
      if (!res.ok) {
        if (res.status === 409) {
          setSelectedSlot(null);
          if (selectedDate) fetchSlots(selectedDate);
          setStep(1);
          toast.info('Availability was updated. Please select a time again.');
          return;
        }
        throw new Error(data?.error || `Booking service unavailable (${res.status}). Please try again.`);
      }
      if (!data) {
        throw new Error('Booking service returned an invalid response. Please try again.');
      }
      setBookingSuccess(data);
      toast.success('Meeting scheduled! Your Google Meet link is ready.');
    } catch (error) {
      console.error('Failed to schedule:', error);
      toast.error(error.message || 'Failed to schedule. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFallbackSubmit = async (e) => {
    e?.preventDefault();
    setIsSubmitting(true);
    try {
      const { SendEmail } = await import('@/api/integrations');
      const { submitLeadToGeoCommandCenter } = await import('@/api/leads');
      await SendEmail({
        from_name: 'AGS - Book a Call',
        to: 'info@atlasgrowths.com',
        subject: `Call Request from ${formData.name}`,
        body: `
          <h2>New Call Request</h2>
          <p><strong>Name:</strong> ${formData.name}</p>
          <p><strong>Email:</strong> ${formData.email}</p>
          <p><strong>Phone:</strong> ${formData.phone}</p>
          <p><strong>Business:</strong> ${formData.business || 'Not provided'}</p>
          <p><strong>Preferred Date:</strong> ${formData.preferredDate || 'Not specified'}</p>
          <p><strong>Preferred Time:</strong> ${formData.preferredTime || 'Not specified'}</p>
          <p><strong>Qualification:</strong> ${JSON.stringify(qualificationAnswers, null, 2)}</p>
          <p><strong>Message:</strong> ${formData.message || 'Not provided'}</p>
        `,
      });
      submitLeadToGeoCommandCenter({
        source: 'scheduled_call',
        name: formData.name,
        email: formData.email,
        phone: formData.phone || undefined,
        business_name: formData.business || undefined,
        preferred_date: formData.preferredDate || undefined,
        preferred_time: formData.preferredTime || undefined,
        message: formData.message || undefined,
        metadata: { qualificationAnswers, opportunityEstimate: opportunity, businessPlaceId: formData.businessPlaceId || undefined },
      });
      toast.success("Call request sent! We'll contact you within 24 hours.");
      handleReset();
    } catch (error) {
      console.error('Failed to send call request:', error);
      toast.error('Failed to send request. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (useFallbackForm) {
    return (
      <Dialog open={isOpen} onOpenChange={(open) => !open && handleReset()}>
        <DialogContent className="sm:max-w-[520px] p-8">
          <DialogHeader>
            <DialogTitle className="text-xl">Book a Free Consultation</DialogTitle>
            <DialogDescription>
              Fill out the form and we'll contact you within 24 hours to schedule your call.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleFallbackSubmit} className="space-y-5 mt-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="fallback-name">Name *</Label>
                <Input
                  id="fallback-name"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="John Doe"
                  className="h-11 mt-1.5"
                />
              </div>
              <div>
                <Label htmlFor="fallback-email">Email *</Label>
                <Input
                  id="fallback-email"
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="john@example.com"
                  className="h-11 mt-1.5"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="fallback-phone">Phone *</Label>
                <Input
                  id="fallback-phone"
                  type="tel"
                  required
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="+1 (555) 123-4567"
                  className="h-11 mt-1.5"
                />
              </div>
              <div>
                <BusinessSearchInput
                  value={formData.business}
                  onChange={(v) => setFormData({ ...formData, business: v })}
                  onPlaceSelect={({ placeId }) => setFormData((prev) => ({ ...prev, businessPlaceId: placeId }))}
                  label="Business Name"
                  id="fallback-business"
                  placeholder="Type to search: e.g., Starbucks Dubai Mall"
                  inputClassName="h-11 mt-1.5"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="fallback-preferred-date">Preferred Date</Label>
                <Input
                  id="fallback-preferred-date"
                  type="date"
                  value={formData.preferredDate}
                  onChange={(e) => setFormData({ ...formData, preferredDate: e.target.value })}
                  className="h-11 mt-1.5"
                />
              </div>
              <div>
                <Label htmlFor="fallback-preferred-time">Preferred Time</Label>
                <Input
                  id="fallback-preferred-time"
                  value={formData.preferredTime}
                  onChange={(e) => setFormData({ ...formData, preferredTime: e.target.value })}
                  placeholder="e.g. 2pm EST, morning"
                  className="h-11 mt-1.5"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="fallback-message">What would you like to discuss?</Label>
              <Textarea
                id="fallback-message"
                value={formData.message}
                onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                placeholder="Tell us about your business goals..."
                rows={3}
                className="mt-1.5"
              />
            </div>
            <div className="flex gap-3 pt-2">
              <Button type="button" variant="outline" onClick={handleReset} className="flex-1" disabled={isSubmitting}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting} className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white">
                {isSubmitting ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Sending...</> : 'Request Call'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    );
  }

  if (bookingSuccess) {
    return (
      <Dialog open={isOpen} onOpenChange={(open) => !open && handleReset()}>
        <DialogContent className="sm:max-w-[440px] p-8">
          <div className="text-center py-4">
            <div className="w-14 h-14 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-4">
              <Check className="w-7 h-7 text-emerald-600" />
            </div>
            <h3 className="text-lg font-semibold text-slate-900 mb-2">Meeting Scheduled!</h3>
            <p className="text-sm text-slate-600 mb-4">
              Your consultation call has been confirmed. A calendar invite has been sent to your email.
            </p>
            {bookingSuccess.start_time && bookingSuccess.end_time && (
              <p className="text-sm font-medium text-slate-700 mb-4">
                {new Date(bookingSuccess.start_time).toLocaleDateString('en-US', {
                  weekday: 'long',
                  month: 'long',
                  day: 'numeric',
                  year: 'numeric',
                })}{' '}
                at{' '}
                {new Date(bookingSuccess.start_time).toLocaleTimeString('en-US', {
                  hour: 'numeric',
                  minute: '2-digit',
                  hour12: true,
                  timeZone: 'America/New_York',
                })}{' '}
                EST
              </p>
            )}
            <a
              href={bookingSuccess.meet_link || bookingSuccess.meetLink}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block w-full py-3 px-4 rounded-lg bg-emerald-600 text-white font-medium hover:bg-emerald-700 transition-colors"
            >
              Join Google Meet
            </a>
            <Button variant="ghost" onClick={handleReset} className="w-full mt-3">
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleReset()}>
      <DialogContent className="sm:max-w-[720px] lg:max-w-[800px] max-h-[90vh] overflow-y-auto p-0 gap-0">
        <div className="px-8 pt-8 pb-6 border-b border-slate-100">
          <div className="flex items-center justify-between mb-4">
            <DialogHeader>
              <DialogTitle className="text-xl font-semibold text-slate-900">
                Book a Free Visibility Audit
              </DialogTitle>
              <DialogDescription className="text-slate-500 text-sm mt-0.5">
                20-minute call • Google Meet link included
              </DialogDescription>
            </DialogHeader>
            <div className="text-sm font-medium text-slate-500">
              Step {step === 4 && !hasScanData ? 3 : step} of {hasScanData ? 4 : 3}
            </div>
          </div>
          <div className="flex gap-1">
            {(hasScanData ? STEPS : STEPS.filter((s) => s.id !== 4)).map((s) => (
              <div
                key={s.id}
                className={cn(
                  'h-1 flex-1 rounded-full transition-colors',
                  s.id <= step ? 'bg-emerald-500' : 'bg-slate-200'
                )}
              />
            ))}
          </div>
        </div>

        <div className="px-8 py-8 min-h-[320px]">
          {/* Step 1: Date & Time */}
          {step === 1 && (
            <div className="grid grid-cols-1 lg:grid-cols-[1fr_1fr] gap-8">
              <div>
                <Label className="text-slate-700 font-medium mb-3 block">Select a date</Label>
                <BookingCalendar
                  selected={selectedDate}
                  onSelect={handleDateSelect}
                  className="border border-slate-200 rounded-xl bg-white p-4"
                />
              </div>
              <div className="space-y-4">
                {selectedDate && (
                  <div>
                    <p className="text-sm font-medium text-slate-800">{formatSelectedDate(selectedDate)}</p>
                    <p className="text-xs text-slate-500 mt-0.5">All times shown in Eastern Time</p>
                  </div>
                )}
                <div>
                  <Label className="text-slate-700 font-medium mb-3 block flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    Choose a time
                  </Label>
                  {!selectedDate ? (
                    <p className="text-sm text-slate-500 py-6">Select a date first</p>
                  ) : loadingSlots ? (
                    <div className="flex items-center gap-2 py-6 text-slate-500">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span className="text-sm">Loading available slots...</span>
                    </div>
                  ) : slots.length === 0 ? (
                    <p className="text-sm text-slate-500 py-6">No times available for this date. Try another.</p>
                  ) : (
                    <div className="space-y-4">
                      {(() => {
                        const { am, pm } = groupSlotsByPeriod(slots);
                        const SlotBtn = ({ slot }) => {
                          const isSelected = selectedSlot?.start === slot.start;
                          return (
                            <Button
                              key={slot.start}
                              type="button"
                              variant="outline"
                              size="sm"
                              className={cn(
                                'transition-colors',
                                isSelected
                                  ? 'bg-emerald-600 border-emerald-600 text-white hover:bg-emerald-700 hover:border-emerald-700'
                                  : 'border-slate-200 hover:bg-slate-50 hover:border-slate-300'
                              )}
                              onClick={() => setSelectedSlot(slot)}
                            >
                              {formatSlotTime(slot.start)}
                            </Button>
                          );
                        };
                        return (
                          <>
                            {am.length > 0 && (
                              <div>
                                <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2">Morning</p>
                                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                                  {am.map((slot) => <SlotBtn key={slot.start} slot={slot} />)}
                                </div>
                              </div>
                            )}
                            {pm.length > 0 && (
                              <div>
                                <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2">Afternoon</p>
                                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                                  {pm.map((slot) => <SlotBtn key={slot.start} slot={slot} />)}
                                </div>
                              </div>
                            )}
                          </>
                        );
                      })()}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Business Questions */}
          {step === 2 && (
            <div className="space-y-6 max-w-xl">
              <p className="text-slate-600 text-sm">Help us understand your business so we can personalize your audit.</p>
              {BUSINESS_QUESTIONS.map((q) => (
                <div key={q.key}>
                  <Label className="text-slate-800 font-medium mb-2 block">{q.label}</Label>
                  <div className="flex flex-wrap gap-2 mt-1.5">
                    {q.options.map((opt) => (
                      <Button
                        key={opt}
                        type="button"
                        variant="outline"
                        size="sm"
                        className={cn(
                          'transition-colors',
                          qualificationAnswers[q.key] === opt
                            ? 'bg-slate-900 text-white border-slate-900 hover:bg-slate-800 hover:border-slate-800'
                            : 'border-slate-200 hover:bg-slate-50'
                        )}
                        onClick={() => setQualificationAnswers((prev) => ({ ...prev, [q.key]: opt }))}
                      >
                        {opt}
                      </Button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Step 3: Confirm */}
          {step === 3 && (
            <div className="space-y-6 max-w-md">
              <p className="text-sm text-slate-500">20-minute call • Google Meet link included</p>
              <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-5 space-y-3">
                <div className="flex items-center gap-2 text-slate-700">
                  <Calendar className="w-4 h-4 text-emerald-600" />
                  <span className="font-medium">{formatSelectedDate(selectedDate)}</span>
                </div>
                <div className="flex items-center gap-2 text-slate-700">
                  <Clock className="w-4 h-4 text-emerald-600" />
                  <span>{selectedSlot && formatSlotTime(selectedSlot.start)} EST</span>
                </div>
              </div>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="confirm-name">Name *</Label>
                  <Input
                    id="confirm-name"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="John Doe"
                    className="h-11 mt-1.5"
                  />
                </div>
                <div>
                  <Label htmlFor="confirm-email">Email *</Label>
                  <Input
                    id="confirm-email"
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="john@example.com"
                    className="h-11 mt-1.5"
                  />
                </div>
                <div>
                  <Label htmlFor="confirm-phone">Phone *</Label>
                  <Input
                    id="confirm-phone"
                    type="tel"
                    required
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="+1 (555) 123-4567"
                    className="h-11 mt-1.5"
                  />
                </div>
                <div>
                  <BusinessSearchInput
                    value={formData.business}
                    onChange={(v) => setFormData({ ...formData, business: v })}
                    onPlaceSelect={({ placeId }) => setFormData((prev) => ({ ...prev, businessPlaceId: placeId }))}
                    label="Business Name"
                    id="confirm-business"
                    placeholder="Type to search: e.g., Starbucks Dubai Mall"
                    inputClassName="h-11 mt-1.5"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Step 4: Opportunity Estimate (only when user has run a scan) */}
          {hasScanData && step === 4 && opportunity && (
            <Card className="border border-slate-200 shadow-sm bg-gradient-to-br from-slate-50 to-white">
              <CardContent className="p-8">
                <h3 className="text-lg font-semibold text-slate-900 mb-6 text-center">Your Visibility Opportunity</h3>
                <div className="space-y-5 text-center">
                  <p className="text-slate-700">
                    We will discuss your ai visibility opportunity and create a plan specialized for your business!
                  </p>
                  <p className="text-sm text-slate-500 pt-2">
                    Competitors with stronger AI visibility are likely capturing this demand.
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {hasScanData && step === 4 && !opportunity && (
            <div className="py-12 text-center text-slate-500">Calculating your opportunity...</div>
          )}
        </div>

        <div className="px-8 py-6 border-t border-slate-100 flex items-center justify-between gap-4">
          <Button
            type="button"
            variant="ghost"
            onClick={() =>
              setStep((s) => (s === 4 ? 3 : s === 3 ? 2 : Math.max(1, s - 1)))
            }
            disabled={step === 1}
            className="text-slate-600"
          >
            <ChevronLeft className="w-4 h-4 mr-1" />
            Back
          </Button>
          {step < 4 && (step !== 3 || hasScanData) ? (
            <Button
              type="button"
              onClick={() => setStep((s) => s + 1)}
              disabled={
                (step === 1 && !canProceedFromStep1) ||
                (step === 2 && !canProceedFromStep2) ||
                (step === 3 && !canProceedFromStep3)
              }
              className="bg-slate-900 hover:bg-slate-800 text-white"
            >
              Continue
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          ) : (
            <Button
              type="button"
              onClick={handleSchedule}
              disabled={!canProceedFromStep3 || isSubmitting}
              className="bg-emerald-600 hover:bg-emerald-700 text-white px-8"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Scheduling...
                </>
              ) : (
                <>
                  Confirm Your Free Visibility Audit
                </>
              )}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
