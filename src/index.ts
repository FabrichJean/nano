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


      const firstDirectory = files.find(file => file.isDirectory());
      if (!firstDirectory) {
          res.status(404).send('Aucun dossier trouvé');
          return;
      }

      const folderPath = path.join(basePath, firstDirectory.name);

      res.sendFile(folderPath+"/");
  });
});

app.use('/api/deployments', deploymentRoutes);
app.use('/api/auth', authRoutes);

app.get("/auth", guardToken, (_req, res) => {
  res.status(202).send();
});

app.get('/ping', (_req, res) => {
  res.json("pong !");
});

app.get('*', (req, res, next) => {
  try {
    const redr = req.headers["referer"]?.split("/")
    const originalUrl = req.originalUrl
    if(!redr || !originalUrl){
      res.redirect(originalUrl+"/")
      return
    }
  
    const sub = redr.join("").replace("/~", "")

    const basePath = resolveSafeUploadPath(redr?.at(4) ?? "");
    if (!basePath) {
      res.status(400).send('Chemin invalide');
      return;
    }

    // Lire les fichiers et dossiers dans le chemin
    fs.readdir(basePath, { withFileTypes: true }, (err, files) => {
        if (err) {
            res.status(404).send('Chemin introuvable');
            return;
        }
  
        // Trouver le premier dossier
        const firstDirectory = files.find(file => file.isDirectory());
        if (!firstDirectory) {
            res.status(404).send('Aucun dossier trouvé');
            return;
        }
  
        const folderPath = path.join(basePath, firstDirectory.name);
        // res.send({redr, originalUrl, folderPath})
        const final = `/${redr?.at(3)}/${redr?.at(4)}/${folderPath.split("/").reverse().at(0)}${originalUrl}`
        res.redirect(final)
        // res.sendFile(folderPath+"/");
    });
  } catch (error) {
    next(error)
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});