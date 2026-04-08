import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

/**
 * /scan — randomly splits 50/50 traffic to /scan-a (Version A) or /scan-b (Version B).
 * Persists the variant in sessionStorage so the user doesn't flip mid-session.
 */
export default function ScanRouter() {
  const navigate = useNavigate();

  useEffect(() => {
    let variant = sessionStorage.getItem('scan_ab_variant');
    if (!variant) {
      variant = Math.random() < 0.5 ? 'scan-a' : 'scan-b';
      sessionStorage.setItem('scan_ab_variant', variant);
    }
    navigate('/' + variant, { replace: true });
  }, [navigate]);

  return null;
}
