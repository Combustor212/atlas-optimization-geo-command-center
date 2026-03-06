import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Building } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Reusable Company Logo Component
 * Handles custom logo with fallback to text or default logo
 * Shows logo + company name (e.g. AGS) side by side, both clickable to home
 * Props:
 * - companyLogoUrl: URL of the custom company logo
 * - companyName: Name of the company (for fallback)
 * - linkTo: Where the logo should link to (default: '/')
 * - className: Additional classes for container
 * - size: 'sm' | 'md' | 'lg' (default: 'md')
 */
export default function CompanyLogo({ 
  companyLogoUrl, 
  companyName = 'AGS',
  linkTo = '/',
  className = '',
  size = 'md'
}) {
  const [imageError, setImageError] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  // Size configurations
  const logoSizeClasses = {
    sm: 'h-8 w-8',
    md: 'h-9 w-9 lg:h-10 lg:w-10',
    lg: 'h-10 w-10 lg:h-12 lg:w-12'
  };

  const textSizeClasses = {
    sm: 'text-lg',
    md: 'text-xl lg:text-2xl',
    lg: 'text-2xl lg:text-3xl'
  };

  // AGS logo (local) - used when no custom company logo or as fallback
  const defaultLogoUrl = "/ags-logo.png";

  // Determine which logo to show
  const logoToShow = !imageError && companyLogoUrl ? companyLogoUrl : defaultLogoUrl;
  const showTextFallback = imageError && !companyLogoUrl;

  const handleImageError = () => {
    setImageError(true);
    setIsLoaded(false);
  };

  const handleImageLoad = () => {
    setIsLoaded(true);
  };

  return (
    <Link 
      to={linkTo} 
      className={cn(
        "inline-flex items-center gap-2 group transition-all duration-300",
        className
      )}
      aria-label={`Go to ${companyName} homepage`}
    >
      {showTextFallback ? (
        // Text fallback with icon
        <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-gradient-to-br from-indigo-50 to-purple-50 group-hover:from-indigo-100 group-hover:to-purple-100 transition-all duration-300">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center">
            <Building className="w-5 h-5 text-white" />
          </div>
          <span className={cn(
            "font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent",
            textSizeClasses[size]
          )}>
            {companyName}
          </span>
        </div>
      ) : (
        // Logo + company name side by side
        <>
          <img
            src={logoToShow}
            alt={`${companyName} Logo`}
            onError={handleImageError}
            onLoad={handleImageLoad}
            className={cn(
              "shrink-0 object-contain transition-all duration-300 group-hover:scale-105 group-hover:drop-shadow-lg",
              logoSizeClasses[size],
              !isLoaded && "opacity-50"
            )}
          />
          <span className={cn(
            "font-bold truncate text-slate-900 group-hover:text-indigo-600",
            textSizeClasses[size]
          )}>
            {companyName}
          </span>
        </>
      )}
    </Link>
  );
}