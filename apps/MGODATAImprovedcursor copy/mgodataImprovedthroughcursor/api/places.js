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
      const fields = [
        'place_id','name','formatted_address','address_components',
        'website','international_phone_number','formatted_phone_number',
        'opening_hours','rating','user_ratings_total','types','business_status',
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
