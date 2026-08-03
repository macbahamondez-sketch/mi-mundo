export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const { q } = req.query;
    const PIXABAY_KEY = process.env.PIXABAY_API_KEY;

    if (!PIXABAY_KEY) {
      return res.status(200).json({ error: 'Falta configurar PIXABAY_API_KEY en Vercel.' });
    }

    const url = 'https://pixabay.com/api/?key=' + PIXABAY_KEY + '&q=' + encodeURIComponent(q) + '&per_page=15&image_type=photo';

    const response = await fetch(url);
    const data = await response.json();

    return res.status(200).json(data);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
