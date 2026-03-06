import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { FileText, Mail, Shield, AlertTriangle, CheckCircle2, XCircle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import MarketingHeader from '../components/MarketingHeader';
import SEOHead from '../components/cms/SEOHead';

export default function TermsOfService() {
  const lastUpdated = "November 17, 2025";

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      <SEOHead pageName="terms-of-service" />
      <MarketingHeader />

      <div className="pt-32 pb-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          {/* Header */}
          <div className="text-center mb-16">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-indigo-100 to-blue-100 rounded-2xl mb-6">
              <FileText className="w-8 h-8 text-indigo-600" />
            </div>
            <h1 className="text-5xl font-bold text-slate-900 mb-4">
              Terms of Service
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
                    Welcome to AGS. By accessing or using our platform, you agree to be bound by these Terms of Service ("Terms"). Please read them carefully before using our services.
                  </p>
                </div>

                {/* Section 1 */}
                <div className="mb-12">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center">
                      <CheckCircle2 className="w-5 h-5 text-indigo-600" />
                    </div>
                    <h2 className="text-2xl font-bold text-slate-900 m-0">
                      1. Agreement to Terms
                    </h2>
                  </div>
                  <div className="ml-13">
                    <p className="text-slate-700 leading-relaxed mb-4">
                      By creating an account, running scans, or accessing any part of AGS, you agree to:
                    </p>
                    <ul className="list-disc pl-6 space-y-2 text-slate-700">
                      <li>These Terms of Service</li>
                      <li>Our <Link to={createPageUrl('PrivacyPolicy')} className="text-purple-600 hover:underline font-medium">Privacy Policy</Link></li>
                      <li>All applicable laws and regulations</li>
                    </ul>
                    <p className="text-slate-700 leading-relaxed mt-4">
                      If you do not agree, you may not use our services.
                    </p>
                  </div>
                </div>

                {/* Section 2 */}
                <div className="mb-12">
                  <h2 className="text-2xl font-bold text-slate-900 mb-4">
                    2. What AGS Is
                  </h2>
                  <div className="ml-13">
                    <p className="text-slate-700 leading-relaxed mb-4">
                      AGS is an AI-powered local business visibility platform that:
                    </p>
                    <ul className="list-disc pl-6 space-y-2 text-slate-700">
                      <li>Scans business visibility across Google Maps, AI search engines, and review platforms</li>
                      <li>Provides MEO (Maps Engine Optimization) and GEO (Generative Engine Optimization) scores</li>
                      <li>Offers actionable recommendations to improve online presence</li>
                      <li>Generates reports and insights for local businesses</li>
                    </ul>
                  </div>
                </div>

                {/* Section 3 */}
                <div className="mb-12">
                  <h2 className="text-2xl font-bold text-slate-900 mb-4">
                    3. User Accounts
                  </h2>
                  <div className="ml-13">
                    <p className="text-slate-700 leading-relaxed mb-4">
                      <strong className="text-slate-900">Account Creation:</strong>
                    </p>
                    <ul className="list-disc pl-6 space-y-2 text-slate-700 mb-4">
                      <li>You must provide accurate and complete information</li>
                      <li>You must be at least 18 years old</li>
                      <li>You are responsible for maintaining account security</li>
                      <li>You must not share your account credentials</li>
                    </ul>
                    <p className="text-slate-700 leading-relaxed mb-4">
                      <strong className="text-slate-900">Account Termination:</strong>
                    </p>
                    <ul className="list-disc pl-6 space-y-2 text-slate-700">
                      <li>You may cancel your account at any time</li>
                      <li>We reserve the right to suspend or terminate accounts that violate these Terms</li>
                      <li>Upon termination, your access to services will cease immediately</li>
                    </ul>
                  </div>
                </div>

                {/* Section 4 */}
                <div className="mb-12">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center">
                      <CheckCircle2 className="w-5 h-5 text-green-600" />
                    </div>
                    <h2 className="text-2xl font-bold text-slate-900 m-0">
                      4. Acceptable Use
                    </h2>
                  </div>
                  <div className="ml-13">
                    <p className="text-slate-700 leading-relaxed mb-4">
                      You agree to use AGS only for lawful purposes. You may:
                    </p>
                    <ul className="list-disc pl-6 space-y-2 text-slate-700">
                      <li>Scan and analyze businesses you own or have authorization to audit</li>
                      <li>Use reports and data for business improvement purposes</li>
                      <li>Share scan results with clients (if applicable)</li>
                      <li>Access features included in your subscription plan</li>
                    </ul>
                  </div>
                </div>

                {/* Section 5 */}
                <div className="mb-12">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center">
                      <XCircle className="w-5 h-5 text-red-600" />
                    </div>
                    <h2 className="text-2xl font-bold text-slate-900 m-0">
                      5. Prohibited Actions
                    </h2>
                  </div>
                  <div className="ml-13">
                    <p className="text-slate-700 leading-relaxed mb-4">
                      You may not:
                    </p>
                    <ul className="list-disc pl-6 space-y-2 text-slate-700">
                      <li>Abuse, harass, or harm other users or businesses</li>
                      <li>Scrape, reverse-engineer, or attempt to access our systems improperly</li>
                      <li>Upload malware, viruses, or malicious code</li>
                      <li>Violate any laws or regulations</li>
                      <li>Resell or redistribute our services without authorization</li>
                      <li>Use automated tools to spam or overload our platform</li>
                      <li>Scan businesses without proper authorization</li>
                      <li>Misrepresent your identity or affiliation</li>
                    </ul>
                  </div>
                </div>

                {/* Section 6 */}
                <div className="mb-12">
                  <h2 className="text-2xl font-bold text-slate-900 mb-4">
                    6. Subscription Plans & Payments
                  </h2>
                  <div className="ml-13">
                    <p className="text-slate-700 leading-relaxed mb-4">
                      <strong className="text-slate-900">Billing:</strong>
                    </p>
                    <ul className="list-disc pl-6 space-y-2 text-slate-700 mb-4">
                      <li>Subscriptions renew automatically unless canceled</li>
                      <li>Prices are subject to change with 30 days' notice</li>
                      <li>Payment is processed securely via Stripe</li>
                      <li>Refunds are available within 14 days of initial purchase (not renewals)</li>
                    </ul>
                    <p className="text-slate-700 leading-relaxed mb-4">
                      <strong className="text-slate-900">Cancellation:</strong>
                    </p>
                    <ul className="list-disc pl-6 space-y-2 text-slate-700">
                      <li>You may cancel at any time from your account settings</li>
                      <li>Access continues until the end of the current billing period</li>
                      <li>No refunds for partial months</li>
                    </ul>
                  </div>
                </div>

                {/* Section 7 */}
                <div className="mb-12">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center">
                      <AlertTriangle className="w-5 h-5 text-amber-600" />
                    </div>
                    <h2 className="text-2xl font-bold text-slate-900 m-0">
                      7. Disclaimer & Limitations
                    </h2>
                  </div>
                  <div className="ml-13">
                    <p className="text-slate-700 leading-relaxed mb-4">
                      <strong className="text-slate-900">Scanner Accuracy:</strong>
                    </p>
                    <ul className="list-disc pl-6 space-y-2 text-slate-700 mb-4">
                      <li>Our scans provide estimates based on available data</li>
                      <li>Scores are not guarantees of future performance</li>
                      <li>Third-party APIs (Google, OpenAI) may have occasional errors</li>
                      <li>We are not responsible for actions taken based on scan results</li>
                    </ul>
                    <p className="text-slate-700 leading-relaxed mb-4">
                      <strong className="text-slate-900">Service Availability:</strong>
                    </p>
                    <ul className="list-disc pl-6 space-y-2 text-slate-700">
                      <li>We strive for 99.9% uptime but cannot guarantee uninterrupted service</li>
                      <li>Maintenance windows may cause temporary unavailability</li>
                      <li>We are not liable for lost revenue due to service disruptions</li>
                    </ul>
                  </div>
                </div>

                {/* Section 8 */}
                <div className="mb-12">
                  <h2 className="text-2xl font-bold text-slate-900 mb-4">
                    8. Beta Access Rules
                  </h2>
                  <div className="ml-13">
                    <p className="text-slate-700 leading-relaxed mb-4">
                      AGS is currently in Early Access Beta. This means:
                    </p>
                    <ul className="list-disc pl-6 space-y-2 text-slate-700">
                      <li>Features may change or be removed without notice</li>
                      <li>Bugs and issues are expected and will be fixed promptly</li>
                      <li>Early users get locked pricing before full launch</li>
                      <li>We appreciate feedback to improve the platform</li>
                    </ul>
                  </div>
                </div>

                {/* Section 9 */}
                <div className="mb-12">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center">
                      <Shield className="w-5 h-5 text-purple-600" />
                    </div>
                    <h2 className="text-2xl font-bold text-slate-900 m-0">
                      9. Intellectual Property
                    </h2>
                  </div>
                  <div className="ml-13">
                    <p className="text-slate-700 leading-relaxed mb-4">
                      <strong className="text-slate-900">Our Rights:</strong>
                    </p>
                    <ul className="list-disc pl-6 space-y-2 text-slate-700 mb-4">
                      <li>AGS, our logo, and platform features are our intellectual property</li>
                      <li>You may not copy, reproduce, or distribute our software</li>
                      <li>All AI algorithms and scoring methodologies are proprietary</li>
                    </ul>
                    <p className="text-slate-700 leading-relaxed mb-4">
                      <strong className="text-slate-900">Your Rights:</strong>
                    </p>
                    <ul className="list-disc pl-6 space-y-2 text-slate-700">
                      <li>You retain ownership of your business data</li>
                      <li>Scan reports generated for you are yours to use</li>
                      <li>We will never claim ownership of your content</li>
                    </ul>
                  </div>
                </div>

                {/* Section 10 */}
                <div className="mb-12">
                  <h2 className="text-2xl font-bold text-slate-900 mb-4">
                    10. Limitation of Liability
                  </h2>
                  <div className="ml-13">
                    <p className="text-slate-700 leading-relaxed mb-4">
                      To the fullest extent permitted by law:
                    </p>
                    <ul className="list-disc pl-6 space-y-2 text-slate-700">
                      <li>AGS is provided "as is" without warranties of any kind</li>
                      <li>We are not liable for indirect, incidental, or consequential damages</li>
                      <li>Our total liability shall not exceed the amount you paid in the last 12 months</li>
                      <li>Some jurisdictions do not allow these limitations, so they may not apply to you</li>
                    </ul>
                  </div>
                </div>

                {/* Section 11 */}
                <div className="mb-12">
                  <h2 className="text-2xl font-bold text-slate-900 mb-4">
                    11. Indemnification
                  </h2>
                  <div className="ml-13">
                    <p className="text-slate-700 leading-relaxed">
                      You agree to indemnify and hold harmless AGS, its affiliates, and employees from any claims, damages, or expenses arising from your use of the platform, violation of these Terms, or infringement of any third-party rights.
                    </p>
                  </div>
                </div>

                {/* Section 12 */}
                <div className="mb-12">
                  <h2 className="text-2xl font-bold text-slate-900 mb-4">
                    12. Changes to Terms
                  </h2>
                  <div className="ml-13">
                    <p className="text-slate-700 leading-relaxed">
                      We may update these Terms from time to time. We will notify you of significant changes via email or a prominent notice on our platform. Continued use of AGS after changes means you accept the updated Terms.
                    </p>
                  </div>
                </div>

                {/* Section 13 */}
                <div className="mb-12">
                  <h2 className="text-2xl font-bold text-slate-900 mb-4">
                    13. Governing Law
                  </h2>
                  <div className="ml-13">
                    <p className="text-slate-700 leading-relaxed">
                      These Terms are governed by the laws of the State of Delaware, United States, without regard to conflict of law principles. Any disputes shall be resolved in the courts located in Delaware.
                    </p>
                  </div>
                </div>

                {/* Section 14 */}
                <div className="mb-12">
                  <h2 className="text-2xl font-bold text-slate-900 mb-4">
                    14. Severability
                  </h2>
                  <div className="ml-13">
                    <p className="text-slate-700 leading-relaxed">
                      If any provision of these Terms is found to be unenforceable, the remaining provisions will remain in full effect.
                    </p>
                  </div>
                </div>

                {/* Contact Section */}
                <div className="mt-16 p-8 bg-gradient-to-br from-indigo-50 to-blue-50 rounded-2xl border border-indigo-100">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-indigo-600 rounded-xl flex items-center justify-center shrink-0">
                      <Mail className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-slate-900 mb-2">
                        Questions About These Terms?
                      </h3>
                      <p className="text-slate-700 leading-relaxed mb-4">
                        If you have any questions or concerns about these Terms of Service, please contact us:
                      </p>
                      <div className="space-y-2 text-slate-700">
                        <p><strong>Email:</strong> <a href="mailto:info@atlasgrowths.com" className="text-indigo-600 hover:underline">info@atlasgrowths.com</a></p>
                        <p><strong>Phone:</strong> <a href="tel:513-999-4390" className="text-indigo-600 hover:underline">513-999-4390</a></p>
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
              className="inline-flex items-center text-indigo-600 hover:text-indigo-700 font-medium transition-colors"
            >
              ← Back to Home
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}