import { Request, Response } from 'express';
import { sign } from 'jsonwebtoken';
import { z } from 'zod';
import UserService, { EmailTakenError, UsernameTakenError } from '../services/userService';
import { sendVerificationEmail } from '../utils/mailer';

const userService = new UserService();

const registerSchema = z.object({
  username: z.string().trim().min(3, "Le nom d'utilisateur doit contenir au moins 3 caractères"),
  email: z.string().trim().email('Adresse email invalide'),
  password: z.string().min(6, 'Le mot de passe doit contenir au moins 6 caractères')
});

const loginSchema = z.object({
  identifier: z.string().trim().min(1, "Nom d'utilisateur ou email requis"),
  password: z.string().min(1, 'Mot de passe requis')
});

const identifierSchema = z.object({
  identifier: z.string().trim().min(1, "Nom d'utilisateur ou email requis")
});

const verifySchema = z.object({
  identifier: z.string().trim().min(1, "Nom d'utilisateur ou email requis"),
  code: z.string().trim().length(6, 'Le code doit contenir 6 chiffres')
});

function issueToken(user: { id: string; username: string }) {
  return sign({ id: user.id, username: user.username }, process.env.JWT_SECRET as string, { expiresIn: '1d' });
}

export const register = async (req: Request, res: Response) => {
  const validation = registerSchema.safeParse(req.body);
  if (!validation.success) {
    return res.status(400).json({ error: validation.error.issues[0]?.message ?? 'Requête invalide' });
  }

  const { username, email, password } = validation.data;

  let user;
  try {
    user = userService.create(username, email, password);
  } catch (error) {
    if (error instanceof UsernameTakenError || error instanceof EmailTakenError) {
      return res.status(409).json({ error: error.message });
    }
    return res.status(500).json({ error: "Échec de l'inscription" });
  }

  const code = userService.issueVerificationCode(user.id);

  try {
    await sendVerificationEmail(email, code);
  } catch (error) {
    userService.delete(user.id);
    console.error("Échec de l'envoi de l'email de vérification:", (error as Error).message || error);
    return res.status(502).json({ error: "Impossible d'envoyer l'email de vérification, réessaie plus tard" });
  }

  res.status(201).json({
    message: 'Compte créé. Vérifie ton email pour activer ton compte.',
    email
  });
};

export const login = (req: Request, res: Response) => {
  const validation = loginSchema.safeParse(req.body);
  if (!validation.success) {
    return res.status(400).json({ error: validation.error.issues[0]?.message ?? 'Requête invalide' });
  }

  const user = userService.verifyPassword(validation.data.identifier, validation.data.password);
  if (!user) {
    return res.status(401).json({ error: 'Identifiants incorrects' });
  }

  if (!user.emailVerified) {
    return res.status(403).json({
      error: 'Email non vérifié',
      needsVerification: true,
      email: user.email
    });
  }

  res.status(200).json({ token: issueToken(user) });
};

export const verifyEmail = (req: Request, res: Response) => {
  const validation = verifySchema.safeParse(req.body);
  if (!validation.success) {
    return res.status(400).json({ error: validation.error.issues[0]?.message ?? 'Requête invalide' });
  }

  const user = userService.confirmVerificationCode(validation.data.identifier, validation.data.code);
  if (!user) {
    return res.status(400).json({ error: 'Code invalide ou expiré' });
  }

  res.status(200).json({ token: issueToken(user) });
};

export const resendVerificationCode = async (req: Request, res: Response) => {
  const validation = identifierSchema.safeParse(req.body);
  if (!validation.success) {
    return res.status(400).json({ error: validation.error.issues[0]?.message ?? 'Requête invalide' });
  }

  const user = userService.findByIdentifier(validation.data.identifier);
  if (!user) {
    return res.status(404).json({ error: 'Compte introuvable' });
  }
  if (user.emailVerified) {
    return res.status(400).json({ error: 'Cet email est déjà vérifié' });
  }
  if (!user.email) {
    return res.status(400).json({ error: 'Ce compte ne possède pas d\'email' });
  }

  const code = userService.issueVerificationCode(user.id);

  try {
    await sendVerificationEmail(user.email, code);
  } catch (error) {
    console.error("Échec de l'envoi de l'email de vérification:", (error as Error).message || error);
    return res.status(502).json({ error: "Impossible d'envoyer l'email de vérification, réessaie plus tard" });
  }

  res.status(200).json({ message: 'Un nouveau code a été envoyé.' });
};
