import path from 'path';
import fs from 'fs';
import { Deployment } from '../types/deployment';
import { extractZip } from '../utils/fileUtils';
import { uploadToEpta } from '../utils/epta';
import { db } from '../db/database';

export class DeploymentExistsError extends Error {
  constructor(name: string) {
    super(`A deployment named "${name}" already exists`);
    this.name = 'DeploymentExistsError';
  }
}

export default class DeploymentService {
  private deploymentsPath: string;
  private baseUrl: string;

  constructor() {
    this.deploymentsPath = path.join(__dirname, '../../uploads');
    this.baseUrl = process.env.BASE_URL || 'http://localhost:3000';

    if (!fs.existsSync(this.deploymentsPath)) {
      fs.mkdirSync(this.deploymentsPath, { recursive: true });
    }
  }

  async createDeployment(name: string, files: any, ownerId: string): Promise<Deployment> {
    const id = name;
    const deploymentPath = path.join(this.deploymentsPath, id);

    if (this.findById(id) || fs.existsSync(deploymentPath)) {
      throw new DeploymentExistsError(name);
    }

    fs.mkdirSync(deploymentPath);

    try {
      const uploadedFile = files.build;
      const zipPath = path.join(deploymentPath, `${name}.zip`);
      await uploadedFile.mv(zipPath);

      // Extract ZIP file directly to the deployment path
      await extractZip(zipPath, deploymentPath);

      // Best-effort mirror to Epta: a deployment should still succeed locally
      // even if that external service is unreachable.
      try {
        await uploadToEpta(zipPath);
      } catch (error) {
        console.warn(`Failed to upload deployment "${name}" to Epta:`, (error as Error).message || error);
      }

      // Remove ZIP file after extraction
      fs.unlinkSync(zipPath);
    } catch (error) {
      fs.rmSync(deploymentPath, { recursive: true, force: true });
      throw error;
    }

    const deployment: Deployment = {
      id,
      name,
      createdAt: new Date().toISOString(),
      path: deploymentPath,
      status: 'active',
      url: `${this.baseUrl}/~/${id}`,
      ownerId
    };

    db.prepare(`
      INSERT INTO deployments (id, name, createdAt, path, status, url, ownerId)
      VALUES (@id, @name, @createdAt, @path, @status, @url, @ownerId)
    `).run(deployment);

    return deployment;
  }

  /** Recherche interne, tous propriétaires confondus (vérification d'unicité de l'id). */
  private findById(id: string): Deployment | undefined {
    return db.prepare('SELECT * FROM deployments WHERE id = ?').get(id) as Deployment | undefined;
  }

  /** Un déploiement est visible par son propriétaire, ou par tout le monde s'il n'a pas de propriétaire (sites de démo). */
  getDeployment(id: string, ownerId: string): Deployment | undefined {
    const deployment = this.findById(id);
    if (!deployment) return undefined;
    if (deployment.ownerId && deployment.ownerId !== ownerId) return undefined;
    return deployment;
  }

  getAllDeployments(ownerId: string): Deployment[] {
    return db.prepare(`
      SELECT * FROM deployments
      WHERE ownerId = ? OR ownerId IS NULL
      ORDER BY createdAt DESC
    `).all(ownerId) as Deployment[];
  }

  deleteDeployment(id: string, ownerId: string): boolean {
    const deployment = this.findById(id);
    if (!deployment || deployment.ownerId !== ownerId) return false;

    fs.rmSync(deployment.path, { recursive: true, force: true });
    db.prepare('DELETE FROM deployments WHERE id = ?').run(id);
    return true;
  }
}
