import React, { useEffect } from 'react';
import { SEOSettings } from '@/api/entities';
import { useQuery } from '@tanstack/react-query';

export default function SEOHead({ pageName }) {
  const { data: seoSettings } = useQuery({
    queryKey: ['seo-settings', pageName],
    queryFn: async () => {
      const data = await SEOSettings.filter({ pageName });
      return data && data.length > 0 ? data[0] : null;
    },
    enabled: !!pageName,
  });

  useEffect(() => {
    if (!seoSettings) return;

    // Update document title
    if (seoSettings.pageTitle) {
      document.title = seoSettings.pageTitle;
    }

    // Update or create meta tags
    const updateMetaTag = (name, content, isProperty = false) => {
      if (!content) return;
      
      const attribute = isProperty ? 'property' : 'name';
      let meta = document.querySelector(`meta[${attribute}="${name}"]`);
      
      if (!meta) {
        meta = document.createElement('meta');
        meta.setAttribute(attribute, name);
        document.head.appendChild(meta);
      }
      
      meta.setAttribute('content', content);
    };

    // Standard meta tags
    updateMetaTag('description', seoSettings.metaDescription);
    
    if (seoSettings.keywords && seoSettings.keywords.length > 0) {
      updateMetaTag('keywords', seoSettings.keywords.join(', '));
    }
    
    if (!seoSettings.indexPage) {
      updateMetaTag('robots', 'noindex, nofollow');
    } else {
      // Remove noindex if it exists
      const robotsMeta = document.querySelector('meta[name="robots"]');
      if (robotsMeta) {
        robotsMeta.remove();
      }
    }

    // Open Graph tags
    updateMetaTag('og:title', seoSettings.ogTitle || seoSettings.pageTitle, true);
    updateMetaTag('og:description', seoSettings.ogDescription || seoSettings.metaDescription, true);
    updateMetaTag('og:image', seoSettings.ogImage, true);

    // Twitter Card tags
    updateMetaTag('twitter:card', 'summary_large_image');
    updateMetaTag('twitter:title', seoSettings.ogTitle || seoSettings.pageTitle);
    updateMetaTag('twitter:description', seoSettings.ogDescription || seoSettings.metaDescription);
    updateMetaTag('twitter:image', seoSettings.ogImage);

  }, [seoSettings]);

  // This component doesn't render anything
  return null;
}