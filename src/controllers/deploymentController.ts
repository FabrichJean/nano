import { Response } from 'express';
import { z } from 'zod';
import DeploymentService, { DeploymentExistsError } from '../services/deploymentService';
import { AuthenticatedRequest } from '../middleware/requireAuth';

const deploymentService = new DeploymentService();

const createDeploymentSchema = z.object({
  name: z.string().min(1)
});

export const createDeployment = async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.files || !req.files.build) {
      return res.status(400).json({ error: 'No build files uploaded' });
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
