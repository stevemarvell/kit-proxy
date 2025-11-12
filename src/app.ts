import express, { Express } from 'express';
import { SchemaRepository } from './types/schema';
import { ConvertKitClient } from './types/convertkit';
import { createSchemaRouter } from './routes/schemaRoutes';
import { createSubscribeRouter } from './routes/subscribeRoutes';
import { errorHandler } from './middleware/errorHandler';

export function createApp(
  schemaRepository: SchemaRepository,
  convertKitClient: ConvertKitClient
): Express {
  const app = express();

  app.use(express.json());

  // Health check endpoint
  app.get('/health', (req, res) => {
    res.status(200).json({ status: 'ok' });
  });

  // Schema routes
  app.use('/api', createSchemaRouter(schemaRepository));

  // Subscribe routes
  app.use('/api', createSubscribeRouter(convertKitClient, schemaRepository));

  // Error handling
  app.use(errorHandler);

  return app;
}
