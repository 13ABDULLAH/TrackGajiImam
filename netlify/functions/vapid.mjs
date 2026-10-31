// GET /api/vapid → kunci awam VAPID (selamat untuk didedahkan)
import { json } from '../lib/server.mjs';

export default async () => {
  const publicKey = process.env.VAPID_PUBLIC_KEY;
  if (!publicKey) return json({ error: 'VAPID_PUBLIC_KEY belum ditetapkan di Netlify' }, 500);
  return json({ publicKey });
};

export const config = { path: '/api/vapid', method: 'GET' };
