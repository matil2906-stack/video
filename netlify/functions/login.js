const { supaFetch, randomToken, jsonResponse } = require('./_shared');

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return jsonResponse(405, { error: 'Méthode non autorisée' });
  try {
    const { username } = JSON.parse(event.body || '{}');
    const clean = (username || '').trim();
    if (!clean) return jsonResponse(400, { error: 'Choisis un pseudo' });

    const users = await supaFetch(`users?username=eq.${encodeURIComponent(clean)}&select=*`);
    if (!users || users.length === 0) {
      return jsonResponse(400, { error: "Ce pseudo n'existe pas" });
    }

    const token = randomToken();
    await supaFetch(`users?id=eq.${users[0].id}`, {
      method: 'PATCH',
      body: JSON.stringify({ session_token: token })
    });

    return jsonResponse(200, { ok: true, username: users[0].username, token });
  } catch (e) {
    console.error('Erreur /login :', e);
    return jsonResponse(500, { error: 'Erreur serveur pendant la connexion' });
  }
};
