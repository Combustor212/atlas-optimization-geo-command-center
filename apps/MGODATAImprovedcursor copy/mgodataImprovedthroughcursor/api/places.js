// Vercel serverless function — server-side Places API proxy
// Bypasses browser CORS and API key referrer restrictions entirely

const PLACES_BASE = 'https://maps.googleapis.com/maps/api/place';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { action, input, place_id } = req.query;
  const key = process.env.VITE_PLACES_API_KEY;

  if (!key) return res.status(500).json({ error: 'API key not configured' });

  try {
    if (action === 'autocomplete' && input) {
      const params = new URLSearchParams({
        input: input.trim(),
        types: 'establishment',
        key,
      });
      const r = await fetch(`${PLACES_BASE}/autocomplete/json?${params}`);
      const data = await r.json();
      return res.status(200).json(data);
    }

    if (action === 'details' && place_id) {
      // geometry is REQUIRED for MEO scoring (lat/lng for nearbysearch). Omitting it
      // causes the backend MEO engine to fail with:
      //   "MEO scoring blocked: Geometry location (latitude/longitude) is required"
      // when the server-side Places key has referrer restrictions and falls back
      // to client-supplied place_data.
      //
      // photos is REQUIRED for the PHOTOS card and the visual-content scoring
      // component. Omitting it caused the scan to always show "Photos = 0"
      // whenever the geo backend's server-side Places call was rejected and
      // it fell back to this client-supplied place_data.
      const fields = [
        'place_id','name','formatted_address','address_components',
        'website','international_phone_number','formatted_phone_number',
        'opening_hours','rating','user_ratings_total','types','business_status',
        'geometry','photos','editorial_summary',
      ].join(',');
      const params = new URLSearchParams({ place_id, fields, key });
      const r = await fetch(`${PLACES_BASE}/details/json?${params}`);
      const data = await r.json();
      return res.status(200).json(data);
    }

    return res.status(400).json({ error: 'Missing action or required params' });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
