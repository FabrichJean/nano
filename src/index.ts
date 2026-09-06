import express from 'express';
import cors from 'cors';
import fileUpload from 'express-fileupload';
import path from 'path';
import deploymentRoutes from './routes/deploymentRoutes';
import authRoutes from './routes/authRoutes';
import dotenv from 'dotenv';
import { guardToken } from './middleware/guardtoken';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors({
  origin: '*'
}));
app.use(express.json());
const MAX_DEPLOYMENT_SIZE_BYTES = 50 * 1024 * 1024;

app.use(fileUpload({
  limits: { fileSize: MAX_DEPLOYMENT_SIZE_BYTES },
  createParentPath: true,
  abortOnLimit: true,
  responseOnLimit: JSON.stringify({ error: `Le fichier dépasse la taille maximale autorisée (${MAX_DEPLOYMENT_SIZE_BYTES / (1024 * 1024)} Mo)` })
}));

app.get('/', (_req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'index.html'));
});

app.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', "login.html"));
});
app.get('/register', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', "register.html"));
});
app.get('/verify-email', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', "verify-email.html"));
});
app.get('/app', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', "app.html"));
});
app.get('/teams', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', "teams.html"));
});
app.get('/settings', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', "settings.html"));
});

// Serve static files
app.use(express.static(path.join(__dirname, 'views')));

app.use('/api/deployments', deploymentRoutes);
app.use('/api/auth', authRoutes);

app.get("/auth", guardToken, (_req, res) => {
  res.status(202).send();
});

app.get('/ping', (_req, res) => {
  res.json("pong !");
});

// Filet de sécurité final : n'importe quelle erreur non gérée plus haut atterrit
// ici plutôt que de faire fuiter une stack trace (et des chemins disque réels)
// au client.
app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err);
  if (!res.headersSent) {
    res.status(500).send('Erreur interne du serveur');
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
