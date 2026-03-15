import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Mail, Phone, MessageCircle, Check, Calendar, Loader2 } from 'lucide-react';
import MarketingHeader from '../components/MarketingHeader';
import { SendEmail } from '@/api/integrations';
import { submitLeadToGeoCommandCenter } from '@/api/leads';
import { toast } from 'sonner';
import { BookACallModal } from '@/components/booking/BookACallModal';

/** Get geoScore from scan results in sessionStorage (when user came from ScanResults) */
function getGeoScoreFromSession() {
  try {
    const raw = sessionStorage.getItem('scanResults');
    if (!raw) return null;
    const data = JSON.parse(raw);
    const score =
      typeof data?.scores?.geo === 'number' ? data.scores.geo
      : typeof data?.geo?.score === 'number' ? data.geo.score
      : typeof data?.geo?.explain?.geoScore === 'number' ? data.geo.explain.geoScore
      : null;
    return score;
  } catch {
    return null;
  }
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
  const [isCallModalOpen, setIsCallModalOpen] = useState(false);
  const [geoScore, setGeoScore] = useState(null);

  // Auto-open Book a Call modal when redirected with ?book=1 (e.g. from scan results)
  useEffect(() => {
    if (searchParams.get('book') === '1') {
      setGeoScore(getGeoScoreFromSession());
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
                    onClick={() => {
                      setGeoScore(getGeoScoreFromSession());
                      setIsCallModalOpen(true);
                    }}
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

      {/* Book a Call Modal - 4-step premium flow */}
      <BookACallModal
        isOpen={isCallModalOpen}
        onClose={() => setIsCallModalOpen(false)}
        geoScore={geoScore}
      />
    </div>
  );
};

export default GetSupportPage;