import React from 'react';
import { Link } from 'react-router-dom';

export default function MGOLogo({ size = 'md', linkTo = '/' }) {
  const sizes = {
    sm: 'h-8',
    md: 'h-10',
    lg: 'h-12'
  };

  const heightClass = sizes[size];

  return (
    <Link to={linkTo} className="inline-flex items-center group">
      <img 
        src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68d742e6c4913147eef6a1ba/8b046e231_ChatGPTImageSep26202509_12_18PM.png"
        alt="MGO Data"
        className={`${heightClass} w-auto object-contain transition-all duration-300 group-hover:scale-105`}
      />
    </Link>
  );
}