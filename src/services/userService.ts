import bcrypt from 'bcryptjs';
import { randomUUID } from 'crypto';
import { db } from '../db/database';

export interface User {
  id: string;
  username: string;
  email: string | null;
  passwordHash: string;
  emailVerified: number;
  verificationCode: string | null;
  verificationExpiresAt: string | null;
  createdAt: string;
}

export class UsernameTakenError extends Error {
  constructor(username: string) {
    super(`Le nom d'utilisateur "${username}" est déjà pris`);
    this.name = 'UsernameTakenError';
  }
}

export class EmailTakenError extends Error {
  constructor(email: string) {
    super(`L'email "${email}" est déjà utilisé`);
    this.name = 'EmailTakenError';
  }
}

const VERIFICATION_CODE_TTL_MS = 15 * 60 * 1000;

function generateVerificationCode(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}

export default class UserService {
  create(username: string, email: string, password: string): Omit<User, 'passwordHash'> {
    if (this.findByUsername(username)) {
      throw new UsernameTakenError(username);
    }
    if (this.findByEmail(email)) {
      throw new EmailTakenError(email);
    }

    const user: User = {
      id: randomUUID(),
      username,
      email,
      passwordHash: bcrypt.hashSync(password, 10),
      emailVerified: 0,
      verificationCode: null,
      verificationExpiresAt: null,
      createdAt: new Date().toISOString()
    };

    db.prepare(`
      INSERT INTO users (id, username, email, passwordHash, emailVerified, verificationCode, verificationExpiresAt, createdAt)
      VALUES (@id, @username, @email, @passwordHash, @emailVerified, @verificationCode, @verificationExpiresAt, @createdAt)
    `).run(user);

    const { passwordHash, ...publicUser } = user;
    return publicUser;
  }

  delete(id: string): void {
    db.prepare('DELETE FROM users WHERE id = ?').run(id);
  }

  findByUsername(username: string): User | undefined {
    return db.prepare('SELECT * FROM users WHERE username = ?').get(username) as User | undefined;
  }

  findByEmail(email: string): User | undefined {
    return db.prepare('SELECT * FROM users WHERE email = ?').get(email) as User | undefined;
  }

  findByIdentifier(identifier: string): User | undefined {
    return db.prepare('SELECT * FROM users WHERE username = ? OR email = ?').get(identifier, identifier) as User | undefined;
  }

  verifyPassword(identifier: string, password: string): User | null {
    const user = this.findByIdentifier(identifier);
    if (!user) return null;
    return bcrypt.compareSync(password, user.passwordHash) ? user : null;
  }

  /** Génère un nouveau code de vérification pour l'utilisateur et le renvoie (à envoyer par email). */
  issueVerificationCode(id: string): string {
    const code = generateVerificationCode();
    const expiresAt = new Date(Date.now() + VERIFICATION_CODE_TTL_MS).toISOString();

    db.prepare('UPDATE users SET verificationCode = ?, verificationExpiresAt = ? WHERE id = ?')
      .run(code, expiresAt, id);

    return code;
  }

  /** Valide un code de vérification et marque l'email comme vérifié si tout correspond. */
  confirmVerificationCode(identifier: string, code: string): User | null {
    const user = this.findByIdentifier(identifier);
    if (!user || !user.verificationCode || !user.verificationExpiresAt) return null;
    if (user.verificationCode !== code) return null;
    if (new Date(user.verificationExpiresAt).getTime() < Date.now()) return null;

    db.prepare('UPDATE users SET emailVerified = 1, verificationCode = NULL, verificationExpiresAt = NULL WHERE id = ?')
      .run(user.id);

    return { ...user, emailVerified: 1, verificationCode: null, verificationExpiresAt: null };
  }
}
