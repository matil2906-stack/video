const express = require('express');
const session = require('express-session');
const bcrypt = require('bcryptjs');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const Database = require('better-sqlite3');

const app = express();
const PORT = process.env.PORT || 3000;

// --- Dossiers ---
const UPLOAD_DIR = path.join(__dirname, 'uploads');
const DATA_DIR = path.join(__dirname, 'data');
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

// --- Base de données ---
const db = new Database(path.join(DATA_DIR, 'app.db'));
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE IF NOT EXISTS videos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    sender_id INTEGER NOT NULL,
    receiver_id INTEGER NOT NULL,
    filename TEXT NOT NULL,
    original_name TEXT NOT NULL,
    display_name TEXT,
    message TEXT,
    size INTEGER NOT NULL,
    uploaded_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(sender_id) REFERENCES users(id),
    FOREIGN KEY(receiver_id) REFERENCES users(id)
  );
`);

// Ajoute les colonnes si la base existait déjà sans elles (mise à jour en douceur)
try { db.exec('ALTER TABLE videos ADD COLUMN display_name TEXT'); } catch (e) {}
try { db.exec('ALTER TABLE videos ADD COLUMN message TEXT'); } catch (e) {}

// --- Middlewares ---
app.set('trust proxy', 1);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});
app.use(session({
  secret: 'change-cette-cle-secrete-avant-de-deployer',
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 1000 * 60 * 60 * 24 * 30 } // 30 jours
}));

function requireAuth(req, res, next) {
  if (!req.session.userId) return res.status(401).json({ error: 'Non connecté' });
  next();
}

// Upload : on garde le fichier tel quel, aucune recompression => qualité intacte
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, unique + path.extname(file.originalname));
  }
});
const upload = multer({
  storage,
  limits: { fileSize: 2 * 1024 * 1024 * 1024 }, // 2 Go max par vidéo
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith('video/')) return cb(new Error('Seules les vidéos sont acceptées'));
    cb(null, true);
  }
});

// --- Routes API ---

// Inscription
app.post('/api/register', (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password || password.length < 4) {
      return res.status(400).json({ error: 'Pseudo et mot de passe (4 caractères min) requis' });
    }
    const exists = db.prepare('SELECT id FROM users WHERE username = ?').get(username);
    if (exists) return res.status(400).json({ error: 'Ce pseudo est déjà pris' });

    const hash = bcrypt.hashSync(password, 10);
    const info = db.prepare('INSERT INTO users (username, password_hash) VALUES (?, ?)').run(username, hash);
    req.session.userId = info.lastInsertRowid;
    req.session.username = username;
    res.json({ ok: true, username });
  } catch (err) {
    console.error('Erreur /api/register :', err);
    res.status(500).json({ error: 'Erreur serveur pendant la création du compte' });
  }
});

// Connexion
app.post('/api/login', (req, res) => {
  try {
    const { username, password } = req.body;
    const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username);
    if (!user || !bcrypt.compareSync(password, user.password_hash)) {
      return res.status(400).json({ error: 'Pseudo ou mot de passe incorrect' });
    }
    req.session.userId = user.id;
    req.session.username = user.username;
    res.json({ ok: true, username: user.username });
  } catch (err) {
    console.error('Erreur /api/login :', err);
    res.status(500).json({ error: 'Erreur serveur pendant la connexion' });
  }
});

// Déconnexion
app.post('/api/logout', (req, res) => {
  req.session.destroy(() => res.json({ ok: true }));
});

// Qui suis-je
app.get('/api/me', (req, res) => {
  if (!req.session.userId) return res.json({ loggedIn: false });
  res.json({ loggedIn: true, username: req.session.username });
});

// Liste des autres utilisateurs (pour choisir un destinataire)
app.get('/api/users', requireAuth, (req, res) => {
  const rows = db.prepare('SELECT username FROM users WHERE id != ? ORDER BY username COLLATE NOCASE')
    .all(req.session.userId);
  res.json(rows.map(r => r.username));
});

// Envoyer une vidéo à un ami (par son pseudo)
app.post('/api/send', requireAuth, upload.single('video'), (req, res) => {
  const { to, name, message } = req.body;
  if (!req.file) return res.status(400).json({ error: 'Aucune vidéo reçue' });

  const receiver = db.prepare('SELECT id FROM users WHERE username = ?').get(to);
  if (!receiver) {
    fs.unlinkSync(req.file.path);
    return res.status(400).json({ error: "Cet ami n'a pas de compte sur le site" });
  }
  if (receiver.id === req.session.userId) {
    fs.unlinkSync(req.file.path);
    return res.status(400).json({ error: 'Tu ne peux pas t\'envoyer une vidéo à toi-même' });
  }

  const finalName = (name && name.trim()) ? name.trim() : req.file.originalname;

  db.prepare(`INSERT INTO videos (sender_id, receiver_id, filename, original_name, display_name, message, size)
              VALUES (?, ?, ?, ?, ?, ?, ?)`)
    .run(req.session.userId, receiver.id, req.file.filename, req.file.originalname, finalName, (message || '').trim(), req.file.size);

  res.json({ ok: true });
});

// Vidéos reçues
app.get('/api/inbox', requireAuth, (req, res) => {
  const rows = db.prepare(`
    SELECT videos.id, videos.original_name, videos.display_name, videos.message, videos.size, videos.uploaded_at, users.username as from_user
    FROM videos JOIN users ON users.id = videos.sender_id
    WHERE videos.receiver_id = ?
    ORDER BY videos.uploaded_at DESC
  `).all(req.session.userId);
  res.json(rows);
});

// Vidéos envoyées
app.get('/api/sent', requireAuth, (req, res) => {
  const rows = db.prepare(`
    SELECT videos.id, videos.original_name, videos.display_name, videos.message, videos.size, videos.uploaded_at, users.username as to_user
    FROM videos JOIN users ON users.id = videos.receiver_id
    WHERE videos.sender_id = ?
    ORDER BY videos.uploaded_at DESC
  `).all(req.session.userId);
  res.json(rows);
});

// Télécharger / regarder une vidéo (seulement si on est l'expéditeur ou le destinataire)
app.get('/api/video/:id', requireAuth, (req, res) => {
  const video = db.prepare('SELECT * FROM videos WHERE id = ?').get(req.params.id);
  if (!video) return res.status(404).send('Introuvable');
  if (video.sender_id !== req.session.userId && video.receiver_id !== req.session.userId) {
    return res.status(403).send('Accès refusé');
  }
  const filePath = path.join(UPLOAD_DIR, video.filename);
  res.setHeader('Content-Disposition', `inline; filename="${video.original_name}"`);
  res.sendFile(filePath);
});

app.listen(PORT, () => {
  console.log(`Serveur lancé sur http://localhost:${PORT}`);
});
