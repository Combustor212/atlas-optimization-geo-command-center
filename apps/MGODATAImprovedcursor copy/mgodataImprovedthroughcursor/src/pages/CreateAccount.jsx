import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';
import { User } from '@/api/entities';
import { createPageUrl } from '@/utils';
import { Link, useNavigate } from 'react-router-dom';
import CompanyLogo from '../components/CompanyLogo';

export default function CreateAccountPage() {
  const [fullName, setFullName] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [needsConfirmation, setNeedsConfirmation] = useState(false);
  const navigate = useNavigate();

  const handleCreateAccount = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    setNeedsConfirmation(false);

    try {
      const { session } = await User.signUp(email, password, {
        full_name: fullName,
        business_name: businessName || undefined
      });

      if (session) {
        navigate(createPageUrl('Dashboard'), { replace: true });
      } else {
        setNeedsConfirmation(true);
      }
    } catch (err) {
      setError(err.message || 'Could not create account. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-[#F8FAFF] to-[#FFFFFF] p-4">
      <div className="w-full max-w-[420px] bg-white rounded-2xl shadow-lg p-7 sm:p-8">
        <div className="flex flex-col items-center mb-6">
          <CompanyLogo size="md" linkTo="/" />
          <p className="text-xs text-slate-500 font-medium mt-2">GEO · MEO · SEO Platform</p>
        </div>

        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-slate-900 mb-2">Create your account</h1>
          <p className="text-slate-600">Start your journey to better local visibility.</p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {needsConfirmation && (
          <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
            <p className="text-sm text-green-700">Check your email to confirm your account, then sign in.</p>
            <Link to={createPageUrl('signin')} className="text-sm font-medium text-green-800 hover:underline mt-1 block">Go to Sign In →</Link>
          </div>
        )}

        <form onSubmit={handleCreateAccount} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="fullName">Full name</Label>
            <Input
              id="fullName"
              type="text"
              autoComplete="name"
              required
              placeholder="Jane Doe"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              disabled={isLoading}
              className="h-12 rounded-xl border-slate-300 focus:border-purple-600 focus:ring-purple-600"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="businessName">Business name (optional)</Label>
            <Input
              id="businessName"
              type="text"
              autoComplete="organization"
              placeholder="Jane's Cafe"
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
              disabled={isLoading}
              className="h-12 rounded-xl border-slate-300 focus:border-purple-600 focus:ring-purple-600"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              required
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isLoading}
              className="h-12 rounded-xl border-slate-300 focus:border-purple-600 focus:ring-purple-600"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              autoComplete="new-password"
              required
              placeholder="••••••••"
              minLength="8"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={isLoading}
              className="h-12 rounded-xl border-slate-300 focus:border-purple-600 focus:ring-purple-600"
            />
          </div>
          
          <Button
            type="submit"
            disabled={isLoading}
            className="w-full h-12 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-medium transition-colors duration-200"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                Processing...
              </>
            ) : (
              'Create account'
            )}
          </Button>
        </form>

        <div className="text-center mt-6">
          <p className="text-sm text-slate-600">
            Already have an account?{' '}
            <Link
              to={createPageUrl('signin')}
              className="text-purple-600 hover:text-purple-700 font-medium"
            >
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}