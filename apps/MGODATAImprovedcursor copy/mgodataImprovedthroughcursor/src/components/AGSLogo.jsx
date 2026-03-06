import React from 'react';
import { Link } from 'react-router-dom';

export default function AGSLogo({ size = 'md', linkTo = '/' }) {
  const sizeClasses = {
    sm: 'h-8 w-8',
    md: 'h-9 w-9 lg:h-10 lg:w-10',
    lg: 'h-10 w-10 lg:h-12 lg:w-12'
  };
  const textSizes = {
    sm: 'text-xl',
    md: 'text-2xl',
    lg: 'text-3xl'
  };

  return (
    <Link
      to={linkTo}
      className="inline-flex items-center gap-2 group font-bold tracking-tight text-slate-900 hover:text-indigo-600 transition-all duration-300"
    >
      <img
        src="/ags-logo.png"
        alt="AGS"
        className={`shrink-0 object-contain ${sizeClasses[size]}`}
      />
      <span className={textSizes[size]}>AGS</span>
    </Link>
  );
}
