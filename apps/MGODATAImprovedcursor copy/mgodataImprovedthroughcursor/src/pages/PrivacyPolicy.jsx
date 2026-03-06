import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Shield, Mail, Lock, Eye, FileText, Users } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import MarketingHeader from '../components/MarketingHeader';
import SEOHead from '../components/cms/SEOHead';

export default function PrivacyPolicy() {
  const lastUpdated = "November 17, 2025";

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      <SEOHead pageName="privacy-policy" />
      <MarketingHeader />

      <div className="pt-32 pb-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          {/* Header */}
          <div className="text-center mb-16">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-purple-100 to-indigo-100 rounded-2xl mb-6">
              <Shield className="w-8 h-8 text-purple-600" />
            </div>
            <h1 className="text-5xl font-bold text-slate-900 mb-4">
              Privacy Policy
            </h1>
            <p className="text-lg text-slate-600">
              Last Updated: {lastUpdated}
            </p>
          </div>

          {/* Content */}
          <Card className="bg-white border-slate-200 shadow-lg rounded-2xl mb-8">
            <CardContent className="p-8 sm:p-12">
              <div className="prose prose-slate max-w-none">
                
                {/* Introduction */}
                <div className="mb-12">
                  <p className="text-slate-700 leading-relaxed text-base">
                    At AGS ("we," "us," or "our"), we take your privacy seriously. This Privacy Policy explains how we collect, use, protect, and share information when you use our AI-powered local business visibility platform.
                  </p>
                </div>

                {/* Section 1 */}
                <div className="mb-12">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center">
                      <Eye className="w-5 h-5 text-purple-600" />
                    </div>
                    <h2 className="text-2xl font-bold text-slate-900 m-0">
                      1. Information We Collect
                    </h2>
                  </div>
                  <div className="ml-13 space-y-4">
                    <p className="text-slate-700 leading-relaxed">
                      <strong className="text-slate-900">Information you provide:</strong>
                    </p>
                    <ul className="list-disc pl-6 space-y-2 text-slate-700">
                      <li>Email address and name when you sign up</li>
                      <li>Business information (name, location, category)</li>
                      <li>Payment details (processed securely via Stripe)</li>
                      <li>Contact messages and feedback</li>
                    </ul>
                    <p className="text-slate-700 leading-relaxed mt-6">
                      <strong className="text-slate-900">Information we collect automatically:</strong>
                    </p>
                    <ul className="list-disc pl-6 space-y-2 text-slate-700">
                      <li>Usage data (pages visited, features used, scan results)</li>
                      <li>Device information (browser type, operating system, IP address)</li>
                      <li>Cookies and similar tracking technologies</li>
                    </ul>
                  </div>
                </div>

                {/* Section 2 */}
                <div className="mb-12">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center">
                      <FileText className="w-5 h-5 text-indigo-600" />
                    </div>
                    <h2 className="text-2xl font-bold text-slate-900 m-0">
                      2. How We Use Your Information
                    </h2>
                  </div>
                  <div className="ml-13">
                    <p className="text-slate-700 leading-relaxed mb-4">
                      We use your information to:
                    </p>
                    <ul className="list-disc pl-6 space-y-2 text-slate-700">
                      <li>Provide and improve our visibility scanning and analysis services</li>
                      <li>Send you scan results and reports</li>
                      <li>Process payments and manage subscriptions</li>
                      <li>Respond to contact requests</li>
                      <li>Send important account updates and product announcements</li>
                      <li>Analyze platform usage to improve features</li>
                      <li>Comply with legal obligations</li>
                    </ul>
                  </div>
                </div>

                {/* Section 3 */}
                <div className="mb-12">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                      <Lock className="w-5 h-5 text-blue-600" />
                    </div>
                    <h2 className="text-2xl font-bold text-slate-900 m-0">
                      3. How We Protect Your Data
                    </h2>
                  </div>
                  <div className="ml-13">
                    <p className="text-slate-700 leading-relaxed mb-4">
                      We implement industry-standard security measures:
                    </p>
                    <ul className="list-disc pl-6 space-y-2 text-slate-700">
                      <li>SSL/TLS encryption for data transmission</li>
                      <li>Encrypted storage of sensitive information</li>
                      <li>Regular security audits and monitoring</li>
                      <li>Restricted access to personal data (staff only when necessary)</li>
                      <li>Secure payment processing via Stripe (PCI-DSS compliant)</li>
                    </ul>
                  </div>
                </div>

                {/* Section 4 */}
                <div className="mb-12">
                  <h2 className="text-2xl font-bold text-slate-900 mb-4">
                    4. Cookies and Tracking
                  </h2>
                  <div className="ml-13">
                    <p className="text-slate-700 leading-relaxed mb-4">
                      We use cookies to improve your experience. Types of cookies we use:
                    </p>
                    <ul className="list-disc pl-6 space-y-2 text-slate-700">
                      <li><strong>Essential cookies:</strong> Required for platform functionality</li>
                      <li><strong>Analytics cookies:</strong> Help us understand usage patterns</li>
                      <li><strong>Preference cookies:</strong> Remember your settings</li>
                    </ul>
                    <p className="text-slate-700 leading-relaxed mt-4">
                      You can control cookies through your browser settings, though some features may not work properly without them.
                    </p>
                  </div>
                </div>

                {/* Section 5 */}
                <div className="mb-12">
                  <h2 className="text-2xl font-bold text-slate-900 mb-4">
                    5. Data Sharing
                  </h2>
                  <div className="ml-13">
                    <p className="text-slate-700 leading-relaxed mb-4 font-semibold text-lg">
                      We do not sell your personal data. Ever.
                    </p>
                    <p className="text-slate-700 leading-relaxed mb-4">
                      We only share data in these limited circumstances:
                    </p>
                    <ul className="list-disc pl-6 space-y-2 text-slate-700">
                      <li><strong>Service providers:</strong> Trusted partners who help us operate (e.g., Stripe for payments, email providers)</li>
                      <li><strong>Legal requirements:</strong> When required by law or to protect our rights</li>
                      <li><strong>Business transfers:</strong> In the event of a merger or acquisition (you'll be notified)</li>
                    </ul>
                  </div>
                </div>

                {/* Section 6 */}
                <div className="mb-12">
                  <h2 className="text-2xl font-bold text-slate-900 mb-4">
                    6. Third-Party Services
                  </h2>
                  <div className="ml-13">
                    <p className="text-slate-700 leading-relaxed mb-4">
                      We integrate with third-party services to provide our features:
                    </p>
                    <ul className="list-disc pl-6 space-y-2 text-slate-700">
                      <li><strong>Stripe:</strong> Payment processing (<a href="https://stripe.com/privacy" target="_blank" rel="noopener noreferrer" className="text-purple-600 hover:underline">Stripe Privacy</a>)</li>
                      <li><strong>Google Places API:</strong> Business data retrieval (<a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer" className="text-purple-600 hover:underline">Google Privacy</a>)</li>
                      <li><strong>OpenAI:</strong> AI analysis (<a href="https://openai.com/policies/privacy-policy" target="_blank" rel="noopener noreferrer" className="text-purple-600 hover:underline">OpenAI Privacy</a>)</li>
                    </ul>
                    <p className="text-slate-700 leading-relaxed mt-4">
                      These services have their own privacy policies, and we encourage you to review them.
                    </p>
                  </div>
                </div>

                {/* Section 7 */}
                <div className="mb-12">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center">
                      <Users className="w-5 h-5 text-green-600" />
                    </div>
                    <h2 className="text-2xl font-bold text-slate-900 m-0">
                      7. Your Rights
                    </h2>
                  </div>
                  <div className="ml-13">
                    <p className="text-slate-700 leading-relaxed mb-4">
                      You have the right to:
                    </p>
                    <ul className="list-disc pl-6 space-y-2 text-slate-700">
                      <li><strong>Access:</strong> Request a copy of your data</li>
                      <li><strong>Update:</strong> Correct inaccurate information</li>
                      <li><strong>Delete:</strong> Request deletion of your account and data</li>
                      <li><strong>Export:</strong> Download your data in a portable format</li>
                      <li><strong>Opt-out:</strong> Unsubscribe from marketing emails</li>
                      <li><strong>Withdraw consent:</strong> Revoke permissions at any time</li>
                    </ul>
                    <p className="text-slate-700 leading-relaxed mt-4">
                      To exercise any of these rights, contact us at <a href="mailto:info@atlasgrowths.com" className="text-purple-600 hover:underline font-medium">info@atlasgrowths.com</a>.
                    </p>
                  </div>
                </div>

                {/* Section 8 */}
                <div className="mb-12">
                  <h2 className="text-2xl font-bold text-slate-900 mb-4">
                    8. Data Retention
                  </h2>
                  <div className="ml-13">
                    <p className="text-slate-700 leading-relaxed">
                      We retain your data for as long as your account is active or as needed to provide services. After account deletion, we retain minimal information for legal/compliance purposes (typically 90 days), then permanently delete everything else.
                    </p>
                  </div>
                </div>

                {/* Section 9 */}
                <div className="mb-12">
                  <h2 className="text-2xl font-bold text-slate-900 mb-4">
                    9. International Data Transfers
                  </h2>
                  <div className="ml-13">
                    <p className="text-slate-700 leading-relaxed">
                      Your data may be processed in the United States or other countries where our service providers operate. We ensure appropriate safeguards are in place to protect your data in compliance with GDPR and other privacy laws.
                    </p>
                  </div>
                </div>

                {/* Section 10 */}
                <div className="mb-12">
                  <h2 className="text-2xl font-bold text-slate-900 mb-4">
                    10. Children's Privacy
                  </h2>
                  <div className="ml-13">
                    <p className="text-slate-700 leading-relaxed">
                      AGS is not intended for users under 18. We do not knowingly collect information from children. If you believe we have collected data from a child, please contact us immediately.
                    </p>
                  </div>
                </div>

                {/* Section 11 */}
                <div className="mb-12">
                  <h2 className="text-2xl font-bold text-slate-900 mb-4">
                    11. Changes to This Policy
                  </h2>
                  <div className="ml-13">
                    <p className="text-slate-700 leading-relaxed">
                      We may update this Privacy Policy from time to time. We'll notify you of significant changes via email or a prominent notice on our platform. Continued use of AGS after changes means you accept the updated policy.
                    </p>
                  </div>
                </div>

                {/* Contact Section */}
                <div className="mt-16 p-8 bg-gradient-to-br from-purple-50 to-indigo-50 rounded-2xl border border-purple-100">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-purple-600 rounded-xl flex items-center justify-center shrink-0">
                      <Mail className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-slate-900 mb-2">
                        Questions About Privacy?
                      </h3>
                      <p className="text-slate-700 leading-relaxed mb-4">
                        If you have any questions or concerns about this Privacy Policy or how we handle your data, please contact us:
                      </p>
                      <div className="space-y-2 text-slate-700">
                        <p><strong>Email:</strong> <a href="mailto:info@atlasgrowths.com" className="text-purple-600 hover:underline">info@atlasgrowths.com</a></p>
                        <p><strong>Phone:</strong> <a href="tel:513-999-4390" className="text-purple-600 hover:underline">513-999-4390</a></p>
                      </div>
                    </div>
                  </div>
                </div>

              </div>
            </CardContent>
          </Card>

          {/* Back Link */}
          <div className="text-center">
            <Link 
              to={createPageUrl('Landing')}
              className="inline-flex items-center text-purple-600 hover:text-purple-700 font-medium transition-colors"
            >
              ← Back to Home
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}