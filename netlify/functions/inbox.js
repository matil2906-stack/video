const { requireAuth, supaFetch, jsonResponse } = require('./_shared');

exports.handler = async (event) => {
  try {
    const user = await requireAuth(event);
    if (!user) return jsonResponse(401, { error: 'Non connecté' });

    const rows = await supaFetch(
      `videos?receiver_id=eq.${user.id}&select=id,display_name,message,size,uploaded_at,sender:sender_id(username)&order=uploaded_at.desc`
    );
    const mapped = (rows || []).map((r) => ({
      id: r.id,
      original_name: r.display_name,
      display_name: r.display_name,
      message: r.message,
      size: r.size,
      uploaded_at: r.uploaded_at,
      from_user: r.sender ? r.sender.username : '?'
    }));
    return jsonResponse(200, mapped);
  } catch (e) {
    console.error('Erreur /inbox :', e);
    return jsonResponse(500, { error: 'Erreur serveur' });
  }
};
