const { supaFetch, randomToken, jsonResponse } = require('./_shared');

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return jsonResponse(405, { error: 'Méthode non autorisée' });
  try {
    const { username } = JSON.parse(event.body || '{}');
    const clean = (username || '').trim();
    if (!clean) return jsonResponse(400, { error: 'Choisis un pseudo' });

    const existing = await supaFetch(`users?username=eq.${encodeURIComponent(clean)}&select=id`);
    if (existing && existing.length > 0) {
      return jsonResponse(400, { error: 'Ce pseudo est déjà pris' });
    }

    const token = randomToken();
    await supaFetch('users', {
      method: 'POST',
      body: JSON.stringify({ username: clean, session_token: token })
    });

    return jsonResponse(200, { ok: true, username: clean, token });
  } catch (e) {
    console.error('Erreur /register :', e);
    return jsonResponse(500, { error: 'Erreur serveur pendant la création du compte' });
  }
};
