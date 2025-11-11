import express, { Express } from 'express';
import { SchemaRepository } from './types/schema';
import { createSchemaRouter } from './routes/schemaRoutes';
import { errorHandler } from './middleware/errorHandler';

export function createApp(schemaRepository: SchemaRepository): Express {
  const app = express();

  app.use(express.json());

  // Health check endpoint
  app.get('/health', (req, res) => {
    res.status(200).json({ status: 'ok' });
  });

  // Schema routes
  app.use('/api', createSchemaRouter(schemaRepository));

  // Error handling
  app.use(errorHandler);

  return app;
}
