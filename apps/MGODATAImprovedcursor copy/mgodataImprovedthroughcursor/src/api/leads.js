/**
 * Submit lead to Geo Command Center (or MGO backend fallback).
 * Non-blocking with 10s timeout per leads-flow-preservation rule.
 */
import { getBookingApiUrl, buildApiUrl } from '@/config/api';

export function submitLeadToGeoCommandCenter(payload) {
  const apiKey = import.meta.env.VITE_AGS_LEADS_API_KEY;
  const geoUrl = getBookingApiUrl('/api/leads');
  const mgoUrl = buildApiUrl('/api/leads');

  const url = apiKey ? geoUrl : mgoUrl;
  const headers = {
    'Content-Type': 'application/json',
    ...(apiKey && { 'x-ags-leads-api-key': apiKey }),
  };

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000);

  fetch(url, { method: 'POST', headers, body: JSON.stringify(payload), signal: controller.signal })
    .then((res) => {
      clearTimeout(timeoutId);
      if (!res.ok) {
        return res.text().then((text) => console.warn('Lead funnel failed:', res.status, text));
      }
    })
    .catch((err) => {
      clearTimeout(timeoutId);
      if (err.name !== 'AbortError') console.warn('Lead funnel error:', err);
    });
}
