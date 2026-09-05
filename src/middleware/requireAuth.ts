import { NextFunction, Request, Response } from 'express';
import { verify } from 'jsonwebtoken';

export interface AuthenticatedRequest extends Request {
  user?: { id: string; username: string };
}

export const requireAuth = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const token = req.headers.authorization?.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Authentification requise' });
  }

  try {
    const decoded = verify(token, process.env.JWT_SECRET as string) as { id: string; username: string };
    req.user = { id: decoded.id, username: decoded.username };
    next();
  } catch (error) {
    res.status(401).json({ error: 'Token invalide' });
  }
};
