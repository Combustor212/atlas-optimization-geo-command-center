import React from 'react';
import { Link } from 'react-router-dom';
import AGSLogo from './AGSLogo';

export default function BetaLayout({ children }) {
  return (
    <div className="min-h-screen bg-gradient-to-b from-[#F9FAFF] to-white">
      {/* Minimal Header with Logo */}
      <header className="pt-8 pb-4 text-center">
        <Link to="/" className="inline-block">
          <AGSLogo size="sm" />
        </Link>
      </header>

      {/* Main Content */}
      <main className="max-w-[1080px] mx-auto px-6 py-20 text-center">
        {children}
      </main>

      {/* Minimal Footer */}
      <footer className="pb-12 text-center">
        <div className="max-w-[1080px] mx-auto px-6">
          {/* Gradient Divider */}
          <div className="h-px bg-gradient-to-r from-transparent via-slate-200 to-transparent mb-8" />
          
          {/* Footer CTA */}
          <p className="text-slate-600 mb-6 text-base">
            Want to see how it works first?{' '}
            <Link to="/" className="text-indigo-600 font-semibold hover:text-indigo-700 transition-colors">
              → Run Free Scan
            </Link>
          </p>

          {/* Contact & Copyright */}
          <p className="text-sm text-slate-500 mb-2">
            Questions? Email us at{' '}
            <a href="mailto:info@atlasgrowths.com" className="text-indigo-600 hover:text-indigo-700 font-medium">
              info@atlasgrowths.com
            </a>
            <span className="text-slate-500"> | </span>
            <a href="tel:513-999-4390" className="text-indigo-600 hover:text-indigo-700 font-medium">
              513-999-4390
            </a>
          </p>
          <p className="text-sm text-slate-400">
            © 2025 AGS. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}