import { Router } from 'express';
import inferenceRouter from './inference.js';
import imagesRouter from './images.js';
import modelsRouter from './models.js';
import providersRouter from './providers.js';
import computeRouter from './compute.js';
import usageRouter from './usage.js';

const router = Router();

// Mount routes at /v1
router.use('/v1', inferenceRouter);
router.use('/v1', imagesRouter);
router.use('/v1', modelsRouter);
router.use('/v1', providersRouter);
router.use('/v1', computeRouter);
router.use('/v1/usage', usageRouter);

export default router;
