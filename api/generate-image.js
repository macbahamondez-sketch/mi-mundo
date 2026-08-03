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
    const { prompt, imageBase64, imageMimeType } = req.body;
    const GEMINI_KEY = process.env.GEMINI_API_KEY;

    if (!GEMINI_KEY) {
      return res.status(200).json({ error: { message: 'Falta configurar GEMINI_API_KEY en Vercel.' } });
    }

    const url = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-preview-image-generation:generateContent';

    const parts = [{ text: prompt }];
    if (imageBase64) {
      parts.push({
        inlineData: {
          mimeType: imageMimeType || 'image/jpeg',
          data: imageBase64
        }
      });
    }

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': GEMINI_KEY
      },
      body: JSON.stringify({
        contents: [{ parts: parts }],
        generationConfig: { responseModalities: ['TEXT', 'IMAGE'] }
      })
    });

    const data = await response.json();

    if (data.error) {
      return res.status(200).json({ error: data.error });
    }

    let imageBase64 = null;
    let textResponse = null;
    if (data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts) {
      for (const part of data.candidates[0].content.parts) {
        if (part.inlineData && part.inlineData.data) {
          imageBase64 = part.inlineData.data;
        }
        if (part.text) {
          textResponse = part.text;
        }
      }
    }

    if (!imageBase64) {
      return res.status(200).json({ error: { message: 'No se pudo generar la imagen. ' + (textResponse || JSON.stringify(data).substring(0,200)) } });
    }

    return res.status(200).json({ image: 'data:image/png;base64,' + imageBase64 });
  } catch (error) {
    return res.status(500).json({ error: { message: error.message } });
  }
}
