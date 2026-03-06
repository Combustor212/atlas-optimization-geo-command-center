import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import SignInCard from './SignInCard';

export default function AuthModal({ isOpen, onClose }) {
  const [mode, setMode] = useState('signin'); // 'signin' or 'signup'

  const handleSwitchToSignUp = () => {
    setMode('signup');
  };

  const handleSwitchToSignIn = () => {
    setMode('signin');
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[440px] p-0 bg-transparent border-0 shadow-none">
        <div className="bg-gradient-to-b from-[#F8FAFF] to-[#FFFFFF] rounded-2xl">
          {mode === 'signin' ? (
            <div className="p-7 sm:p-8">
              <SignInCard 
                onClose={onClose} 
                onSwitchToSignUp={handleSwitchToSignUp}
              />
            </div>
          ) : (
            <div className="p-7 sm:p-8">
              {/* Placeholder for SignUp component - would be similar structure */}
              <div className="text-center">
                <h2 className="text-2xl font-bold mb-4">Create Account</h2>
                <p className="text-slate-600 mb-6">Sign up to get started</p>
                <button
                  onClick={handleSwitchToSignIn}
                  className="text-purple-600 hover:text-purple-700"
                >
                  Back to Sign In
                </button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}