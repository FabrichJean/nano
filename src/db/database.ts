import Database from 'better-sqlite3';
import bcrypt from 'bcryptjs';
import { randomUUID } from 'crypto';
import path from 'path';
import dotenv from 'dotenv';
import { Deployment } from '../types/deployment';

dotenv.config();

const dbPath = path.join(__dirname, '../../data.sqlite');
export const db = new Database(dbPath);

db.pragma('journal_mode = WAL');

db.exec(`
  CREATE TABLE IF NOT EXISTS deployments (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    createdAt TEXT NOT NULL,
    path TEXT NOT NULL,
    status TEXT NOT NULL,
    url TEXT NOT NULL,
    ownerId TEXT
  )
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    email TEXT,
    passwordHash TEXT NOT NULL,
    emailVerified INTEGER NOT NULL DEFAULT 0,
    verificationCode TEXT,
    verificationExpiresAt TEXT,
    createdAt TEXT NOT NULL
  )
`);

// Migrations : ces colonnes ont été ajoutées après coup, donc nullable / avec
// valeur par défaut pour ne pas casser les comptes déjà en base.
const userColumns = db.prepare("PRAGMA table_info(users)").all() as { name: string }[];
const hasColumn = (name: string) => userColumns.some((col) => col.name === name);

if (!hasColumn('email')) {
  db.exec('ALTER TABLE users ADD COLUMN email TEXT');
}
if (!hasColumn('emailVerified')) {
  db.exec('ALTER TABLE users ADD COLUMN emailVerified INTEGER NOT NULL DEFAULT 0');
}
if (!hasColumn('verificationCode')) {
  db.exec('ALTER TABLE users ADD COLUMN verificationCode TEXT');
}
if (!hasColumn('verificationExpiresAt')) {
  db.exec('ALTER TABLE users ADD COLUMN verificationExpiresAt TEXT');
}
db.exec('CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email ON users(email)');

// Migration : le compte historique défini dans .env (USERNAME/PASSWORD) devient un
// utilisateur normal en base, pour ne pas casser les accès existants. Il n'a pas
// d'email à vérifier, donc on le marque directement comme vérifié.
if (process.env.USERNAME && process.env.PASSWORD) {
  const existing = db.prepare('SELECT id FROM users WHERE username = ?').get(process.env.USERNAME);
  if (!existing) {
    db.prepare(`
      INSERT INTO users (id, username, email, passwordHash, emailVerified, createdAt)
      VALUES (@id, @username, @email, @passwordHash, 1, @createdAt)
    `).run({
      id: randomUUID(),
      username: process.env.USERNAME,
      email: null,
      passwordHash: bcrypt.hashSync(process.env.PASSWORD, 10),
      createdAt: new Date().toISOString()
    });
  }
}

const adminUser = process.env.USERNAME
  ? (db.prepare('SELECT id FROM users WHERE username = ?').get(process.env.USERNAME) as { id: string } | undefined)
  : undefined;

const defaultSites: Deployment[] = [
  {
    id: 'kdhak',
    name: 'Fabrich',
    createdAt: new Date('2024-01-01').toISOString(),
    path: 'https://fabrich.vercel.app/',
    status: 'active',
    url: 'https://fabrich.vercel.app/'
  },
  {
    id: 'hjghj',
    name: 'Shop Project',
    createdAt: new Date('2025-01-01').toISOString(),
    path: '/~/shop',
    status: 'active',
    url: '/~/shop'
  },
  {
    id: 'wefgj',
    name: 'Nano Page',
    createdAt: new Date('2025-01-01').toISOString(),
    path: '/~/nano',
    status: 'active',
    url: '/~/nano'
  }
];

const seedStmt = db.prepare(`
  INSERT OR IGNORE INTO deployments (id, name, createdAt, path, status, url, ownerId)
  VALUES (@id, @name, @createdAt, @path, @status, @url, @ownerId)
`);

for (const site of defaultSites) {
  seedStmt.run({ ...site, ownerId: adminUser?.id ?? null });
}

// Migration : ces sites de démo étaient auparavant publics (ownerId NULL, visibles
// par tous les comptes). On les rattache au compte admin s'ils n'ont pas déjà un propriétaire.
if (adminUser) {
  const defaultSiteIds = defaultSites.map((site) => site.id);
  const placeholders = defaultSiteIds.map(() => '?').join(', ');
  db.prepare(`
    UPDATE deployments SET ownerId = ?
    WHERE id IN (${placeholders}) AND ownerId IS NULL
  `).run(adminUser.id, ...defaultSiteIds);
}
