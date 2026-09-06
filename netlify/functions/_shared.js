const crypto = require('crypto');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY;

const B2_KEY_ID = process.env.B2_KEY_ID;
const B2_APP_KEY = process.env.B2_APPLICATION_KEY;
const B2_BUCKET_ID = process.env.B2_BUCKET_ID;
const B2_BUCKET_NAME = process.env.B2_BUCKET_NAME;

// --- Supabase (via l'API REST directe, sans dépendance npm) ---

async function supaFetch(path, options = {}) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...options,
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json',
      Prefer: options.prefer || 'return=representation',
      ...(options.headers || {})
    }
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Supabase error ${res.status}: ${text}`);
  }
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

function randomToken() {
  return crypto.randomBytes(32).toString('hex');
}

function jsonResponse(statusCode, body) {
  return {
    statusCode,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  };
}

async function requireAuth(event) {
  const auth = (event.headers && (event.headers.authorization || event.headers.Authorization)) || '';
  if (!auth.startsWith('Bearer ')) return null;
  const token = auth.slice(7);
  if (!token) return null;
  const users = await supaFetch(`users?session_token=eq.${encodeURIComponent(token)}&select=*`);
  if (!users || users.length === 0) return null;
  return users[0];
}

// --- Backblaze B2 (API native, sans dépendance npm) ---

async function b2Authorize() {
  const credentials = Buffer.from(`${B2_KEY_ID}:${B2_APP_KEY}`).toString('base64');
  const res = await fetch('https://api.backblazeb2.com/b2api/v3/b2_authorize_account', {
    headers: { Authorization: `Basic ${credentials}` }
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Échec authentification B2: ${text}`);
  }
  const data = await res.json();
  return {
    apiUrl: data.apiInfo.storageApi.apiUrl,
    downloadUrl: data.apiInfo.storageApi.downloadUrl,
    authToken: data.authorizationToken
  };
}

async function b2GetUploadUrl() {
  const { apiUrl, authToken } = await b2Authorize();
  const res = await fetch(`${apiUrl}/b2api/v3/b2_get_upload_url`, {
    method: 'POST',
    headers: { Authorization: authToken, 'Content-Type': 'application/json' },
    body: JSON.stringify({ bucketId: B2_BUCKET_ID })
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Échec récupération URL upload B2: ${text}`);
  }
  return res.json();
}

async function b2GetDownloadAuth(fileNamePrefix, validSeconds) {
  const { apiUrl, authToken, downloadUrl } = await b2Authorize();
  const res = await fetch(`${apiUrl}/b2api/v3/b2_get_download_authorization`, {
    method: 'POST',
    headers: { Authorization: authToken, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      bucketId: B2_BUCKET_ID,
      fileNamePrefix,
      validDurationInSeconds: validSeconds || 3600
    })
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Échec autorisation téléchargement B2: ${text}`);
  }
  const data = await res.json();
  return { downloadUrl, authorizationToken: data.authorizationToken };
}

async function b2DeleteFile(fileName, fileId) {
  const { apiUrl, authToken } = await b2Authorize();
  const res = await fetch(`${apiUrl}/b2api/v3/b2_delete_file_version`, {
    method: 'POST',
    headers: { Authorization: authToken, 'Content-Type': 'application/json' },
    body: JSON.stringify({ fileName, fileId })
  });
  return res.ok;
}

module.exports = {
  supaFetch,
  randomToken,
  jsonResponse,
  requireAuth,
  b2Authorize,
  b2GetUploadUrl,
  b2GetDownloadAuth,
  b2DeleteFile,
  B2_BUCKET_NAME
};
