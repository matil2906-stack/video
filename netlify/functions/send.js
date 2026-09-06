const { requireAuth, supaFetch, jsonResponse } = require('./_shared');

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return jsonResponse(405, { error: 'Méthode non autorisée' });
  try {
    const user = await requireAuth(event);
    if (!user) return jsonResponse(401, { error: 'Non connecté' });

    const { to, name, message, b2FileId, b2FileName, size } = JSON.parse(event.body || '{}');
    if (!to || !b2FileId || !b2FileName) {
      return jsonResponse(400, { error: 'Informations manquantes' });
    }

    const receivers = await supaFetch(`users?username=eq.${encodeURIComponent(to)}&select=id`);
    if (!receivers || receivers.length === 0) {
      return jsonResponse(400, { error: "Cet ami n'a pas de compte sur le site" });
    }
    const receiver = receivers[0];
    if (receiver.id === user.id) {
      return jsonResponse(400, { error: "Tu ne peux pas t'envoyer une vidéo à toi-même" });
    }

    await supaFetch('videos', {
      method: 'POST',
      body: JSON.stringify({
        sender_id: user.id,
        receiver_id: receiver.id,
        b2_file_id: b2FileId,
        b2_file_name: b2FileName,
        display_name: name && name.trim() ? name.trim() : b2FileName,
        message: (message || '').trim(),
        size: size || 0
      })
    });

    return jsonResponse(200, { ok: true });
  } catch (e) {
    console.error('Erreur /send :', e);
    return jsonResponse(500, { error: "Erreur serveur pendant l'enregistrement de l'envoi" });
  }
};
