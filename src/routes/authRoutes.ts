import { Router } from 'express';
import { register, login, verifyEmail, resendVerificationCode } from '../controllers/authController';

const router = Router();

router.post('/register', register);
router.post('/login', login);
router.post('/verify-email', verifyEmail);
router.post('/resend-code', resendVerificationCode);

export default router;
