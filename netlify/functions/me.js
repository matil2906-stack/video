const { requireAuth, jsonResponse } = require('./_shared');

exports.handler = async (event) => {
  try {
    const user = await requireAuth(event);
    if (!user) return jsonResponse(200, { loggedIn: false });
    return jsonResponse(200, { loggedIn: true, username: user.username });
  } catch (e) {
    console.error('Erreur /me :', e);
    return jsonResponse(200, { loggedIn: false });
  }
};
