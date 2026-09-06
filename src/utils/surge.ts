import { execFile } from 'child_process';
import path from 'path';

const SURGE_BIN = path.join(__dirname, '../../node_modules/.bin/surge');
const DEPLOY_TIMEOUT_MS = 120_000;

export class SurgeDeployError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SurgeDeployError';
  }
}

/** Transforme un id de déploiement en sous-domaine surge.sh valide. */
export function toSurgeDomain(id: string): string {
  const slug = id
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
  return `${slug || 'site'}.surge.sh`;
}

/** Déploie un dossier local vers surge.sh et renvoie l'URL publique du site. */
export function deployToSurge(projectPath: string, domain: string): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!process.env.SURGE_TOKEN) {
      reject(new SurgeDeployError('SURGE_TOKEN manquant dans la configuration du serveur'));
      return;
    }

    execFile(
      SURGE_BIN,
      [projectPath, domain],
      {
