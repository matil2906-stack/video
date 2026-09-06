const { requireAuth, supaFetch, jsonResponse, b2GetDownloadAuth, B2_BUCKET_NAME } = require('./_shared');

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

    const { downloadUrl, authorizationToken } = await b2GetDownloadAuth(video.b2_file_name, 3600);
    const url = `${downloadUrl}/file/${B2_BUCKET_NAME}/${encodeURIComponent(video.b2_file_name)}?Authorization=${authorizationToken}`;

    return jsonResponse(200, { url, filename: video.display_name });
  } catch (e) {
    console.error('Erreur /download-url :', e);
    return jsonResponse(500, { error: 'Impossible de générer le lien de téléchargement' });
  }
};
