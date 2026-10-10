import { Router } from 'express';
import { getPublishedProducts, getProductById } from '../controllers/product.controller.js';

const router = Router();

// Public / Authenticated catalog endpoints
router.get('/', getPublishedProducts);
router.get('/:id', getProductById);

export default router;

