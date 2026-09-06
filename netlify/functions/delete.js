const { requireAuth, supaFetch, jsonResponse, b2DeleteFile } = require('./_shared');

exports.handler = async (event) => {
  try {
    const user = await requireAuth(event);
    if (!user) return jsonResponse(401, { error: 'Non connecté' });

    const id = event.queryStringParameters && event.queryStringParameters.id;
    if (!id) return jsonResponse(400, { error: 'ID manquant' });

    const rows = await supaFetch(`videos?id=eq.${encodeURIComponent(id)}&select=*`);
    if (!rows || rows.length === 0) return jsonResponse(404, { error: 'Introuvable' });
    const video = rows[0];
    if (video.sender_id !== user.id && video.receiver_id !== user.id) {
      return jsonResponse(403, { error: 'Accès refusé' });
    }

    try {
      await b2DeleteFile(video.b2_file_name, video.b2_file_id);
    } catch (e) {
      console.error('Suppression B2 échouée (on continue quand même) :', e);
    }

    await supaFetch(`videos?id=eq.${encodeURIComponent(id)}`, { method: 'DELETE' });
    return jsonResponse(200, { ok: true });
  } catch (e) {
    console.error('Erreur /delete :', e);
    return jsonResponse(500, { error: 'Erreur serveur pendant la suppression' });
  }
};
