import { Router } from 'express';
import {
  createDeployment,
  getDeployment,
  getAllDeployments,
  deleteDeployment
} from '../controllers/deploymentController';
import { requireAuth } from '../middleware/requireAuth';

const router = Router();

router.use(requireAuth);

router.post('/', createDeployment);
router.get('/', getAllDeployments);
router.get('/:id', getDeployment);
router.delete('/:id', deleteDeployment);

export default router;
