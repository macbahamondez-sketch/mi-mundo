import { Redis } from '@upstash/redis';

const redis = Redis.fromEnv();

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
    const { action, user, pass, pass2, question, answer, newpass, data } = req.body;
    const key = 'user:' + (user || '').toLowerCase().trim();

    // ===== REGISTER =====
    if (action === 'register') {
      if (!user || !pass) return res.status(200).json({ ok: false, error: 'Completa todos los campos' });
      if (user.length < 3) return res.status(200).json({ ok: false, error: 'El usuario debe tener al menos 3 caracteres' });
      if (!answer) return res.status(200).json({ ok: false, error: 'Completa la respuesta de seguridad' });

      const existing = await redis.get(key);
      if (existing) return res.status(200).json({ ok: false, error: 'Ese usuario ya existe' });

      const userData = {
        pass: pass, // stored server-side only, never sent back
        question: question,
        answer: (answer || '').toLowerCase(),
        data: data || {}
      };
      await redis.set(key, userData);
      return res.status(200).json({ ok: true, data: userData.data });
    }

    // ===== LOGIN =====
    if (action === 'login') {
      if (!user || !pass) return res.status(200).json({ ok: false, error: 'Completa todos los campos' });
      const userData = await redis.get(key);
      if (!userData) return res.status(200).json({ ok: false, error: 'Usuario no encontrado' });
      if (userData.pass !== pass) return res.status(200).json({ ok: false, error: 'Contraseña incorrecta' });
      return res.status(200).json({ ok: true, data: userData.data });
    }

    // ===== SAVE DATA (auto-save while using the app) =====
    if (action === 'save') {
      const userData = await redis.get(key);
      if (!userData) return res.status(200).json({ ok: false, error: 'Usuario no encontrado' });
      userData.data = data;
      await redis.set(key, userData);
      return res.status(200).json({ ok: true });
    }

    // ===== CHECK QUESTION (for forgot password) =====
    if (action === 'get-question') {
      const userData = await redis.get(key);
      if (!userData) return res.status(200).json({ ok: false, error: 'Usuario no encontrado' });
      if (!userData.question) return res.status(200).json({ ok: false, error: 'Esta cuenta no tiene pregunta de seguridad' });
      return res.status(200).json({ ok: true, question: userData.question });
    }

    // ===== RESET PASSWORD =====
    if (action === 'reset-password') {
      const userData = await redis.get(key);
      if (!userData) return res.status(200).json({ ok: false, error: 'Usuario no encontrado' });
      if ((userData.answer || '') !== (answer || '').toLowerCase()) {
        return res.status(200).json({ ok: false, error: 'Respuesta incorrecta' });
      }
      if (!newpass || newpass.length < 3) return res.status(200).json({ ok: false, error: 'La nueva contraseña es muy corta' });
      userData.pass = newpass;
      await redis.set(key, userData);
      return res.status(200).json({ ok: true });
    }

    return res.status(200).json({ ok: false, error: 'Acción no reconocida' });
  } catch (error) {
    return res.status(500).json({ ok: false, error: error.message });
  }
}
