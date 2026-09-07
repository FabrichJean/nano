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
        env: { ...process.env },
        timeout: DEPLOY_TIMEOUT_MS,
      },
      (error, stdout, stderr) => {
        if (error) {
          reject(new SurgeDeployError(stderr?.trim() || stdout?.trim() || error.message));
          return;
        }
        resolve(`https://${domain}`);
      }
    );
  });
}

/** Retire un site de surge.sh. Best-effort : on ne bloque jamais la suppression locale dessus. */
export function teardownSurge(domain: string): Promise<void> {
  return new Promise((resolve) => {
    if (!process.env.SURGE_TOKEN) {
      resolve();
      return;
    }
    execFile(
      SURGE_BIN,
      ['teardown', domain],
      { env: { ...process.env }, timeout: DEPLOY_TIMEOUT_MS },
      (error, stdout, stderr) => {
        if (error) {
          console.warn(`Échec du teardown surge.sh pour ${domain}:`, stderr?.trim() || stdout?.trim() || error.message);
        }
        resolve();
      }
    );
  });
}
