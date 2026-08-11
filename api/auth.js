import { createClient } from 'redis';

async function getRedis() {
  const client = createClient({ url: process.env.REDIS_URL });
  await client.connect();
  return client;
}

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

  let client;
  try {
    if (!process.env.REDIS_URL) {
      return res.status(200).json({ ok: false, error: 'DIAGNOSTICO: falta la variable REDIS_URL en Vercel.' });
    }

    client = await getRedis();

    const { action, user, pass, question, answer, newpass, data } = req.body;
    const key = 'user:' + (user || '').toLowerCase().trim();

    // ===== REGISTER =====
    if (action === 'register') {
      if (!user || !pass) return res.status(200).json({ ok: false, error: 'Completa todos los campos' });
      if (user.length < 3) return res.status(200).json({ ok: false, error: 'El usuario debe tener al menos 3 caracteres' });
      if (!answer) return res.status(200).json({ ok: false, error: 'Completa la respuesta de seguridad' });

      const existingRaw = await client.get(key);
      if (existingRaw) { await client.quit(); return res.status(200).json({ ok: false, error: 'Ese usuario ya existe' }); }

      const userData = {
        pass: pass,
        question: question,
        answer: (answer || '').toLowerCase(),
        data: data || {}
      };
      await client.set(key, JSON.stringify(userData));
      await client.quit();
      return res.status(200).json({ ok: true, data: userData.data });
    }

    // ===== LOGIN =====
    if (action === 'login') {
      if (!user || !pass) { await client.quit(); return res.status(200).json({ ok: false, error: 'Completa todos los campos' }); }
      const raw = await client.get(key);
      await client.quit();
      if (!raw) return res.status(200).json({ ok: false, error: 'Usuario no encontrado' });
      const userData = JSON.parse(raw);
      if (userData.pass !== pass) return res.status(200).json({ ok: false, error: 'Contraseña incorrecta' });
      return res.status(200).json({ ok: true, data: userData.data });
    }

    // ===== SAVE DATA =====
    if (action === 'save') {
      const raw = await client.get(key);
      if (!raw) { await client.quit(); return res.status(200).json({ ok: false, error: 'Usuario no encontrado' }); }
      const userData = JSON.parse(raw);
      userData.data = data;
      await client.set(key, JSON.stringify(userData));
      await client.quit();
      return res.status(200).json({ ok: true });
    }

    // ===== GET QUESTION =====
    if (action === 'get-question') {
      const raw = await client.get(key);
      await client.quit();
      if (!raw) return res.status(200).json({ ok: false, error: 'Usuario no encontrado' });
      const userData = JSON.parse(raw);
      if (!userData.question) return res.status(200).json({ ok: false, error: 'Esta cuenta no tiene pregunta de seguridad' });
      return res.status(200).json({ ok: true, question: userData.question });
    }

    // ===== RESET PASSWORD =====
    if (action === 'reset-password') {
      const raw = await client.get(key);
      if (!raw) { await client.quit(); return res.status(200).json({ ok: false, error: 'Usuario no encontrado' }); }
      const userData = JSON.parse(raw);
      if ((userData.answer || '') !== (answer || '').toLowerCase()) {
        await client.quit();
        return res.status(200).json({ ok: false, error: 'Respuesta incorrecta' });
      }
      if (!newpass || newpass.length < 3) { await client.quit(); return res.status(200).json({ ok: false, error: 'La nueva contraseña es muy corta' }); }
      userData.pass = newpass;
      await client.set(key, JSON.stringify(userData));
      await client.quit();
      return res.status(200).json({ ok: true });
    }

    await client.quit();
    return res.status(200).json({ ok: false, error: 'Acción no reconocida' });
  } catch (error) {
    try { if (client) await client.quit(); } catch(e) {}
    return res.status(500).json({ ok: false, error: error.message });
  }
}
