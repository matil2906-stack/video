const { requireAuth, supaFetch, jsonResponse } = require('./_shared');

exports.handler = async (event) => {
  try {
    const user = await requireAuth(event);
    if (!user) return jsonResponse(401, { error: 'Non connecté' });

    const rows = await supaFetch(`users?id=neq.${user.id}&select=username&order=username.asc`);
    return jsonResponse(200, (rows || []).map((r) => r.username));
  } catch (e) {
    console.error('Erreur /users :', e);
    return jsonResponse(500, { error: 'Erreur serveur' });
  }
};
