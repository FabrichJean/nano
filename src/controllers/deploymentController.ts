import { Response } from 'express';
import { z } from 'zod';
import DeploymentService, { DeploymentExistsError } from '../services/deploymentService';
import { AuthenticatedRequest } from '../middleware/requireAuth';
import { SurgeDeployError } from '../utils/surge';

const deploymentService = new DeploymentService();

const createDeploymentSchema = z.object({
  name: z.string().min(1)
});

export const createDeployment = async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.files || !req.files.build) {
      return res.status(400).json({ error: 'No build files uploaded' });
    }

    if (!Array.isArray(req.files.build) && req.files.build.truncated) {
      return res.status(413).json({ error: 'Le fichier dépasse la taille maximale autorisée' });
    }

    const validation = createDeploymentSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({ error: validation.error });
    }

    const deployment = await deploymentService.createDeployment(
      validation.data.name,
      req.files,
      req.user!.id
    );

    res.status(201).json(deployment);
  } catch (error) {
    if (error instanceof DeploymentExistsError) {
      return res.status(409).json({ error: error.message });
    }
    if (error instanceof SurgeDeployError) {
      return res.status(502).json({ error: `Échec du déploiement sur surge.sh : ${error.message}` });
    res.status(500).json({ error, message: 'Failed to create deployment' });
  }
};

export const getDeployment = (req: AuthenticatedRequest, res: Response) => {
  const deployment = deploymentService.getDeployment(req.params.id, req.user!.id);
  if (!deployment) {
    return res.status(404).json({ error: 'Deployment not found' });
  }
  res.json(deployment);
};

export const getAllDeployments = (req: AuthenticatedRequest, res: Response) => {
  const deployments = deploymentService.getAllDeployments(req.user!.id);
  res.json(deployments);
};

export const deleteDeployment = (req: AuthenticatedRequest, res: Response) => {
  const success = deploymentService.deleteDeployment(req.params.id, req.user!.id);
  if (!success) {
    return res.status(404).json({ error: 'Deployment not found' });
  }
  res.status(204).send();
};
