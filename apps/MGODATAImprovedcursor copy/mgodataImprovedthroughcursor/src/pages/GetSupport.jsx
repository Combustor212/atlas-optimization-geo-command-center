import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Mail, Phone, MessageCircle, Check, Calendar, Loader2, Clock } from 'lucide-react';
import { BookingCalendar } from '@/components/booking/BookingCalendar';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import MarketingHeader from '../components/MarketingHeader';
import { SendEmail } from '@/api/integrations';
import { buildApiUrl, getBookingApiUrl } from '@/config/api';
import { toast } from 'sonner';

function submitLeadToGeoCommandCenter(payload) {
  const apiKey = import.meta.env.VITE_AGS_LEADS_API_KEY;
  const geoUrl = getBookingApiUrl('/api/leads');
  const mgoUrl = buildApiUrl('/api/leads');

  const url = apiKey ? geoUrl : mgoUrl;
  const headers = {
    'Content-Type': 'application/json',
    ...(apiKey && { 'x-ags-leads-api-key': apiKey }),
  };

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000);

  fetch(url, { method: 'POST', headers, body: JSON.stringify(payload), signal: controller.signal })
    .then((res) => {
      clearTimeout(timeoutId);
      if (!res.ok) {
        return res.text().then((text) => console.warn('Lead funnel failed:', res.status, text));
      }
    })
    .catch((err) => {
      clearTimeout(timeoutId);
      if (err.name !== 'AbortError') console.warn('Lead funnel error:', err);
    });
}

const GetSupportPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    business: '',
    message: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  // Book a Call Modal State
  const [isCallModalOpen, setIsCallModalOpen] = useState(false);
  const [callFormData, setCallFormData] = useState({
    name: '',
    email: '',
    phone: '',
    business: '',
    preferredDate: '',
    preferredTime: '',
    message: ''
  });
  const [isCallSubmitting, setIsCallSubmitting] = useState(false);
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [slots, setSlots] = useState([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [bookingSuccess, setBookingSuccess] = useState(null);
  const [useFallbackForm, setUseFallbackForm] = useState(false);

  // Auto-open Book a Call modal when redirected with ?book=1 (e.g. from scan results)
  useEffect(() => {
    if (searchParams.get('book') === '1') {
      setIsCallModalOpen(true);
      setSearchParams({}, { replace: true }); // Clear param from URL
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      await SendEmail({
        from_name: 'AGS Contact',
        to: 'info@atlasgrowths.com',
        subject: `Contact Request from ${formData.name}`,
        body: `
          <h2>New Contact Request</h2>
          <p><strong>Name:</strong> ${formData.name}</p>
          <p><strong>Email:</strong> ${formData.email}</p>
          <p><strong>Business:</strong> ${formData.business || 'Not provided'}</p>
          <p><strong>Message:</strong></p>
          <p>${formData.message}</p>
        `
      });

      submitLeadToGeoCommandCenter({
        source: 'contact_form',
        name: formData.name,
        email: formData.email,
        business_name: formData.business || undefined,
        message: formData.message || undefined,
      });

      setSubmitted(true);
      toast.success('Message sent successfully!');
      
      setTimeout(() => {
        setFormData({ name: '', email: '', business: '', message: '' });
        setSubmitted(false);
      }, 3000);
    } catch (error) {
      console.error('Failed to send message:', error);
      toast.error('Failed to send message. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const fetchSlots = async (dateStr) => {
    setLoadingSlots(true);
    try {
      const res = await fetch(getBookingApiUrl(`/api/booking/slots?date=${dateStr}`));
      if (res.status === 503) {
        setUseFallbackForm(true);
        setSlots([]);
        return;
      }
      if (!res.ok) throw new Error('Failed to fetch slots');
      const data = await res.json();
      setSlots(data.slots || []);
    } catch (err) {
      console.warn('Booking slots unavailable, using fallback form:', err);
      setUseFallbackForm(true);
      setSlots([]);
    } finally {
      setLoadingSlots(false);
    }
  };

  const formatSlotTime = (isoStr) => {
    const d = new Date(isoStr);
    return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true, timeZone: 'America/New_York' });
  };

  const formatSelectedDate = (dateStr) => {
    if (!dateStr) return null;
    const d = new Date(dateStr + 'T12:00:00');
    return d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
  };

  const groupSlotsByPeriod = (slotList) => {
    const am = [];
    const pm = [];
    slotList.forEach((slot) => {
      const d = new Date(slot.start);
      const hourStr = d.toLocaleString('en-US', { timeZone: 'America/New_York', hour: 'numeric', hour12: false });
      const hour = parseInt(hourStr, 10) || 0;
      (hour < 12 ? am : pm).push(slot);
    });
    return { am, pm };
  };

  const handleDateSelect = (dateStr) => {
    setSelectedDate(dateStr);
    setSelectedSlot(null);
    fetchSlots(dateStr);
  };

  const handleCallSubmit = async (e) => {
    e.preventDefault();
    if (useFallbackForm) {
      return handleFallbackCallSubmit(e);
    }
    if (!selectedSlot) {
      toast.error('Please select a time slot.');
      return;
    }
    setIsCallSubmitting(true);
    try {
      const res = await fetch(getBookingApiUrl('/api/booking/schedule'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: callFormData.name,
          email: callFormData.email,
          phone: callFormData.phone,
          business: callFormData.business || undefined,
          message: callFormData.message || undefined,
          slotStart: selectedSlot.start,
          slotEnd: selectedSlot.end,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (res.status === 409) {
          toast.error('This time slot is no longer available. Please choose another.');
          setSelectedSlot(null);
          if (selectedDate) fetchSlots(selectedDate);
          return;
        }
        throw new Error(data.error || 'Failed to schedule');
      }
      setBookingSuccess(data);
      toast.success('Meeting scheduled! Your Google Meet link is ready.');
    } catch (error) {
      console.error('Failed to schedule:', error);
      toast.error(error.message || 'Failed to schedule. Please try again.');
    } finally {
      setIsCallSubmitting(false);
    }
  };

  const handleFallbackCallSubmit = async (e) => {
    e.preventDefault();
    setIsCallSubmitting(true);
    try {
      await SendEmail({
        from_name: 'AGS - Book a Call',
        to: 'info@atlasgrowths.com',
        subject: `Call Request from ${callFormData.name}`,
        body: `
          <h2>New Call Request</h2>
          <p><strong>Name:</strong> ${callFormData.name}</p>
          <p><strong>Email:</strong> ${callFormData.email}</p>
          <p><strong>Phone:</strong> ${callFormData.phone}</p>
          <p><strong>Business:</strong> ${callFormData.business || 'Not provided'}</p>
          <p><strong>Preferred Date:</strong> ${callFormData.preferredDate || 'Not specified'}</p>
          <p><strong>Preferred Time:</strong> ${callFormData.preferredTime || 'Not specified'}</p>
          <p><strong>Message:</strong> ${callFormData.message || 'Not provided'}</p>
        `
      });
      submitLeadToGeoCommandCenter({
        source: 'scheduled_call',
        name: callFormData.name,
        email: callFormData.email,
        phone: callFormData.phone || undefined,
        business_name: callFormData.business || undefined,
        preferred_date: callFormData.preferredDate || undefined,
        preferred_time: callFormData.preferredTime || undefined,
        message: callFormData.message || undefined,
      });
      toast.success('Call request sent! We\'ll contact you within 24 hours.');
      setIsCallModalOpen(false);
      setCallFormData({ name: '', email: '', phone: '', business: '', preferredDate: '', preferredTime: '', message: '' });
    } catch (error) {
      console.error('Failed to send call request:', error);
      toast.error('Failed to send request. Please try again.');
    } finally {
      setIsCallSubmitting(false);
    }
  };

  const resetBookingModal = () => {
    setSelectedDate('');
    setSelectedSlot(null);
    setSlots([]);
    setBookingSuccess(null);
    setUseFallbackForm(false);
    setCallFormData({ name: '', email: '', phone: '', business: '', preferredDate: '', preferredTime: '', message: '' });
    setIsCallModalOpen(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-cyan-50 via-white to-blue-50">
      <MarketingHeader />

      {/* Hero Section */}
      <div className="py-20 pt-32">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-16">
            <h1 className="text-5xl lg:text-6xl font-bold text-slate-900 mb-6">
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-600 to-blue-600">
                Contact Us
              </span>
            </h1>
            <p className="text-xl text-slate-600 max-w-3xl mx-auto">
              Have questions? We're here to help you succeed
            </p>
          </div>

          {/* Contact Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            {/* Contact Form */}
            <Card className="bg-white border-slate-200 shadow-lg">
              <CardHeader>
                <CardTitle>Send us a message</CardTitle>
              </CardHeader>
              <CardContent>
                {submitted ? (
                  <div className="text-center py-8">
                    <Check className="w-16 h-16 text-green-500 mx-auto mb-4" />
                    <h3 className="text-xl font-bold text-slate-900 mb-2">Message Sent!</h3>
                    <p className="text-slate-600">We'll get back to you within 24 hours.</p>
                  </div>
                ) : (
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                      <Label htmlFor="name">Name *</Label>
                      <Input
                        id="name"
                        required
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        placeholder="John Doe"
                        className="h-12"
                      />
                    </div>
                    <div>
                      <Label htmlFor="email">Email *</Label>
                      <Input
                        id="email"
                        type="email"
                        required
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        placeholder="john@example.com"
                        className="h-12"
                      />
                    </div>
                    <div>
                      <Label htmlFor="business">Business Name</Label>
                      <Input
                        id="business"
                        value={formData.business}
                        onChange={(e) => setFormData({ ...formData, business: e.target.value })}
                        placeholder="Acme Corp"
                        className="h-12"
                      />
                    </div>
                    <div>
                      <Label htmlFor="message">Message *</Label>
                      <Textarea
                        id="message"
                        required
                        value={formData.message}
                        onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                        placeholder="Tell us about your needs..."
                        rows={5}
                      />
                    </div>
                    <Button
                      type="submit"
                      disabled={isSubmitting}
                      className="w-full h-12 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700 text-white"
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Sending...
                        </>
                      ) : (
                        'Send Message'
                      )}
                    </Button>
                  </form>
                )}
              </CardContent>
            </Card>

            {/* Contact Info */}
            <div className="space-y-6">
              <Card className="bg-white border-slate-200 shadow-lg">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-green-600" />
                    Book a Free Consultation
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-slate-600 mb-4">
                    Not sure which plan is right for you? Book a 30-minute call with our team to discuss your goals.
                  </p>
                  <Button
                    onClick={() => setIsCallModalOpen(true)}
                    className="w-full h-12 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white"
                  >
                    <Calendar className="w-4 h-4 mr-2" />
                    Book a Call
                  </Button>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-r from-cyan-50 to-blue-50 border-cyan-200 shadow-lg">
                <CardHeader>
                  <CardTitle>Contact Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-start gap-3">
                    <Mail className="w-6 h-6 text-cyan-600 mt-1" />
                    <div>
                      <p className="font-semibold text-slate-900">Email</p>
                      <a href="mailto:info@atlasgrowths.com" className="text-cyan-600 hover:underline">
                        info@atlasgrowths.com
                      </a>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Phone className="w-6 h-6 text-cyan-600 mt-1" />
                    <div>
                      <p className="font-semibold text-slate-900">Phone</p>
                      <a href="tel:513-999-4390" className="text-cyan-600 hover:underline">513-999-4390</a>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <MessageCircle className="w-6 h-6 text-cyan-600 mt-1" />
                    <div>
                      <p className="font-semibold text-slate-900">Live Chat</p>
                      <p className="text-slate-600">Available 9am-6pm EST</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-white border-slate-200 shadow-lg">
                <CardHeader>
                  <CardTitle>Business Hours</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-slate-600">Monday - Friday</span>
                    <span className="font-semibold text-slate-900">9am - 6pm EST</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">Saturday</span>
                    <span className="font-semibold text-slate-900">10am - 4pm EST</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">Sunday</span>
                    <span className="font-semibold text-slate-900">Closed</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>

      {/* Book a Call Modal */}
      <Dialog open={isCallModalOpen} onOpenChange={(open) => !open && resetBookingModal()}>
        <DialogContent className="sm:max-w-[680px] lg:max-w-[780px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl flex items-center gap-2">
              <Calendar className="w-6 h-6 text-green-600" />
              Book a Free Consultation
            </DialogTitle>
            <DialogDescription>
              {bookingSuccess
                ? 'Your meeting has been scheduled.'
                : useFallbackForm
                  ? 'Fill out the form and we\'ll contact you within 24 hours to schedule your call.'
                  : 'Choose a date and time, then enter your details. Times are in Eastern (EST).'}
            </DialogDescription>
          </DialogHeader>

          {bookingSuccess ? (
            <div className="space-y-4 mt-4">
              <div className="rounded-lg bg-green-50 border border-green-200 p-4">
                <Check className="w-12 h-12 text-green-600 mx-auto mb-2" />
                <h3 className="font-semibold text-slate-900 text-center mb-2">Meeting Scheduled!</h3>
                <p className="text-sm text-slate-600 text-center mb-2">
                  Your consultation call has been confirmed. A calendar invite has been sent to your email.
                </p>
                {bookingSuccess.start_time && bookingSuccess.end_time && (
                  <p className="text-sm font-medium text-slate-700 text-center mb-3">
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
                    –{' '}
                    {new Date(bookingSuccess.end_time).toLocaleTimeString('en-US', {
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
                  className="block w-full text-center py-3 px-4 rounded-lg bg-green-600 text-white font-medium hover:bg-green-700"
                >
                  Join Google Meet
                </a>
              </div>
              <Button onClick={resetBookingModal} variant="outline" className="w-full">
                Close
              </Button>
            </div>
          ) : useFallbackForm ? (
            <form onSubmit={handleCallSubmit} className="space-y-4 mt-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="call-name">Name *</Label>
                  <Input id="call-name" required value={callFormData.name} onChange={(e) => setCallFormData({ ...callFormData, name: e.target.value })} placeholder="John Doe" className="h-11" />
                </div>
                <div>
                  <Label htmlFor="call-email">Email *</Label>
                  <Input id="call-email" type="email" required value={callFormData.email} onChange={(e) => setCallFormData({ ...callFormData, email: e.target.value })} placeholder="john@example.com" className="h-11" />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="call-phone">Phone *</Label>
                  <Input id="call-phone" type="tel" required value={callFormData.phone} onChange={(e) => setCallFormData({ ...callFormData, phone: e.target.value })} placeholder="+1 (555) 123-4567" className="h-11" />
                </div>
                <div>
                  <Label htmlFor="call-business">Business Name</Label>
                  <Input id="call-business" value={callFormData.business} onChange={(e) => setCallFormData({ ...callFormData, business: e.target.value })} placeholder="Acme Corp" className="h-11" />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="call-preferred-date">Preferred Date</Label>
                  <Input id="call-preferred-date" type="date" value={callFormData.preferredDate} onChange={(e) => setCallFormData({ ...callFormData, preferredDate: e.target.value })} className="h-11" />
                </div>
                <div>
                  <Label htmlFor="call-preferred-time">Preferred Time</Label>
                  <Input id="call-preferred-time" value={callFormData.preferredTime} onChange={(e) => setCallFormData({ ...callFormData, preferredTime: e.target.value })} placeholder="e.g. 2pm EST, morning, afternoon" className="h-11" />
                </div>
              </div>
              <div>
                <Label htmlFor="call-message">What would you like to discuss?</Label>
                <Textarea id="call-message" value={callFormData.message} onChange={(e) => setCallFormData({ ...callFormData, message: e.target.value })} placeholder="Tell us about your business goals, challenges, or questions..." rows={4} />
              </div>
              <div className="flex gap-3 pt-4">
                <Button type="button" variant="outline" onClick={() => setIsCallModalOpen(false)} className="flex-1" disabled={isCallSubmitting}>Cancel</Button>
                <Button type="submit" disabled={isCallSubmitting} className="flex-1 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white">
                  {isCallSubmitting ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Sending...</> : <><Calendar className="w-4 h-4 mr-2" /> Request Call</>}
                </Button>
              </div>
            </form>
          ) : (
            <form onSubmit={handleCallSubmit} className="mt-4">
              <div className="grid grid-cols-1 lg:grid-cols-[1fr_1fr] gap-6 lg:gap-8">
                {/* Calendar - left on desktop */}
                <div>
                  <Label className="text-slate-700 text-sm font-medium mb-2 block">1. Select a date</Label>
                  <BookingCalendar
                    selected={selectedDate}
                    onSelect={handleDateSelect}
                    className="border rounded-lg border-slate-200 bg-white"
                  />
                </div>

                {/* Time slots + form - right on desktop */}
                <div className="grid grid-rows-[auto_1fr_auto] gap-4 min-h-0">
                  {/* Selected date + timezone */}
                  {selectedDate && (
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-slate-700">
                        {formatSelectedDate(selectedDate)}
                      </p>
                      <p className="text-xs text-slate-500">All times shown in Eastern Time</p>
                    </div>
                  )}
                  {/* Time slots */}
                  <div>
                    <Label className="text-slate-700 text-sm font-medium mb-2 block flex items-center gap-1.5">
                      <Clock className="w-4 h-4" />
                      2. Choose a time
                    </Label>
                    {!selectedDate ? (
                      <p className="text-sm text-slate-500 py-3">Select a date first</p>
                    ) : loadingSlots ? (
                      <div className="flex items-center gap-2 py-4 text-slate-500">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span className="text-sm">Loading available slots...</span>
                      </div>
                    ) : slots.length === 0 ? (
                      <p className="text-sm text-slate-500 py-3 rounded-lg bg-slate-50 px-3">No times available for this date. Try another.</p>
                    ) : (
                      <div className="space-y-4">
                        {(() => {
                          const { am, pm } = groupSlotsByPeriod(slots);
                          const SlotButton = ({ slot }) => {
                            const isSelected = selectedSlot?.start === slot.start;
                            return (
                              <Button
                                key={slot.start}
                                type="button"
                                variant="outline"
                                size="sm"
                                className={
                                  isSelected
                                    ? 'bg-green-600 border-green-600 text-white hover:bg-green-700 hover:border-green-700'
                                    : 'border-slate-200 hover:bg-slate-50 hover:border-slate-300 transition-colors'
                                }
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
                                    {am.map((slot) => <SlotButton key={slot.start} slot={slot} />)}
                                  </div>
                                </div>
                              )}
                              {pm.length > 0 && (
                                <div>
                                  <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2">Afternoon</p>
                                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                                    {pm.map((slot) => <SlotButton key={slot.start} slot={slot} />)}
                                  </div>
                                </div>
                              )}
                            </>
                          );
                        })()}
                      </div>
                    )}
                  </div>

                  {/* Form fields - shown when time selected */}
                  {selectedSlot && (
                    <div className="space-y-4 pt-2 border-t border-slate-100">
                      <Label className="text-slate-700 text-sm font-medium block">3. Your details</Label>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="call-name" className="text-xs text-slate-500">Name *</Label>
                          <Input id="call-name" required value={callFormData.name} onChange={(e) => setCallFormData({ ...callFormData, name: e.target.value })} placeholder="John Doe" className="h-11 mt-1" />
                        </div>
                        <div>
                          <Label htmlFor="call-email" className="text-xs text-slate-500">Email *</Label>
                          <Input id="call-email" type="email" required value={callFormData.email} onChange={(e) => setCallFormData({ ...callFormData, email: e.target.value })} placeholder="john@example.com" className="h-11 mt-1" />
                        </div>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="call-phone" className="text-xs text-slate-500">Phone *</Label>
                          <Input id="call-phone" type="tel" required value={callFormData.phone} onChange={(e) => setCallFormData({ ...callFormData, phone: e.target.value })} placeholder="+1 (555) 123-4567" className="h-11 mt-1" />
                        </div>
                        <div>
                          <Label htmlFor="call-business" className="text-xs text-slate-500">Business Name</Label>
                          <Input id="call-business" value={callFormData.business} onChange={(e) => setCallFormData({ ...callFormData, business: e.target.value })} placeholder="Acme Corp" className="h-11 mt-1" />
                        </div>
                      </div>
                      <div>
                        <Label htmlFor="call-message" className="text-xs text-slate-500">What would you like to discuss?</Label>
                        <Textarea id="call-message" value={callFormData.message} onChange={(e) => setCallFormData({ ...callFormData, message: e.target.value })} placeholder="Tell us about your business goals, challenges, or questions..." rows={3} className="mt-1" />
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex gap-3 pt-6 mt-6 border-t border-slate-100">
                <Button type="button" variant="outline" onClick={() => setIsCallModalOpen(false)} className="flex-1" disabled={isCallSubmitting}>Cancel</Button>
                <Button
                  type="submit"
                  disabled={!selectedSlot || !callFormData.name?.trim() || !callFormData.email?.trim() || !callFormData.phone?.trim() || isCallSubmitting}
                  className="flex-1 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white"
                >
                  {isCallSubmitting ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Scheduling...</> : <><Calendar className="w-4 h-4 mr-2" /> Confirm Booking</>}
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default GetSupportPage;