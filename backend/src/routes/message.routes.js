import { Router } from 'express';
import { getThreadMessages, postThreadMessage } from '../controllers/message.controller.js';
import { requireAuth } from '../middleware/auth.middleware.js';

const router = Router();

router.use(requireAuth);

router.get('/:threadType/:referenceId', getThreadMessages);
router.post('/:threadType/:referenceId', postThreadMessage);

export default router;

