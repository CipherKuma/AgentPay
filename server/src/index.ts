import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import swaggerUi from 'swagger-ui-express';
import YAML from 'yamljs';
import { config } from './config/index.js';
import { createX402Middleware, defaultRoutes, dynamicPricingMiddleware } from './middleware/x402.js';
import routes from './routes/index.js';
import type { ApiError } from './types/index.js';
import { healthChecker } from './routing/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Middleware
app.use(express.json());
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  exposedHeaders: ['X-PAYMENT-RESPONSE'],
}));

// Load and serve OpenAPI spec
try {
  const openapiSpec = YAML.load(path.join(__dirname, '../openapi.yaml'));
  app.use('/docs', swaggerUi.serve, swaggerUi.setup(openapiSpec, {
    customCss: '.swagger-ui .topbar { display: none }',
    customSiteTitle: 'AgentPay API Docs',
  }));
  app.get('/openapi.yaml', (_req: Request, res: Response) => {
    res.sendFile(path.join(__dirname, '../openapi.yaml'));
  });
  console.log('[AgentPay] API docs available at /docs');
} catch (err) {
  console.warn('[AgentPay] Could not load OpenAPI spec:', err);
}

// Apply dynamic pricing middleware (calculates price based on request body)
app.use(dynamicPricingMiddleware);

// Apply x402 payment middleware
app.use(createX402Middleware(defaultRoutes));

// Health check
app.get('/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
  });
});

// Mount API routes
app.use(routes);

// Error handling middleware
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error('[Error]', err.message);

  const errorResponse: ApiError = {
    error: {
      code: 'INTERNAL_ERROR',
      message: config.nodeEnv === 'development' ? err.message : 'Internal server error',
    },
  };

  res.status(500).json(errorResponse);
});

// 404 handler
app.use((_req: Request, res: Response) => {
  const errorResponse: ApiError = {
    error: {
      code: 'NOT_FOUND',
      message: 'Endpoint not found',
    },
  };
  res.status(404).json(errorResponse);
});

// Start server
const port = config.port;
app.listen(port, () => {
  console.log(`[AgentPay] Server running on port ${port}`);
  console.log(`[AgentPay] Environment: ${config.nodeEnv}`);
  console.log(`[AgentPay] Facilitator: ${config.movement.facilitatorUrl}`);
  if (!config.movement.payTo) {
    console.warn('[AgentPay] Warning: MOVEMENT_PAY_TO not set, payment verification disabled');
  }

  // Start health checker with 60 second interval
  healthChecker.startChecking(60000);
});
