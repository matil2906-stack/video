const { requireAuth, jsonResponse, b2GetUploadUrl } = require('./_shared');

exports.handler = async (event) => {
  try {
    const user = await requireAuth(event);
    if (!user) return jsonResponse(401, { error: 'Non connecté' });

    const upload = await b2GetUploadUrl();
    return jsonResponse(200, {
      uploadUrl: upload.uploadUrl,
      authorizationToken: upload.authorizationToken
    });
  } catch (e) {
    console.error('Erreur /upload-url :', e);
    return jsonResponse(500, { error: "Impossible de préparer l'envoi, réessaie" });
  }
};
