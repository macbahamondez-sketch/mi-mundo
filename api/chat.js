export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { messages } = req.body;
    const GROQ_KEY = process.env.GROQ_API_KEY;

    // Diagnostic info if key is missing
    if (!GROQ_KEY) {
      return res.status(200).json({ error: { message: 'DIAGNOSTICO: la variable GROQ_API_KEY no llego al servidor. Revisa que este guardada en Vercel.' } });
    }

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + GROQ_KEY
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: messages,
        max_tokens: 500
      })
    });

    const data = await response.json();

    if (data.error) {
      // Add diagnostic info about the key (masked, safe to show)
      const keyPreview = GROQ_KEY.substring(0,7) + '...' + GROQ_KEY.substring(GROQ_KEY.length-4) + ' (largo: ' + GROQ_KEY.length + ')';
      data.error.message = data.error.message + ' | DIAGNOSTICO clave usada: ' + keyPreview;
    }

    return res.status(200).json(data);
  } catch (error) {
    return res.status(500).json({ error: { message: error.message } });
  }
}
