export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const { q } = req.query;
    const PEXELS_KEY = process.env.PEXELS_API_KEY;

    const response = await fetch('https://api.pexels.com/v1/search?query=' + encodeURIComponent(q) + '&per_page=9', {
      headers: { 'Authorization': PEXELS_KEY }
    });

    const data = await response.json();
    return res.status(200).json(data);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
