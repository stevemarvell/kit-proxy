import express, { Express } from 'express';
import cors from 'cors';
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

  // CORS configuration
  const allowedOrigins = process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(',').map(origin => origin.trim())
    : [];

  app.use(cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps, Postman, or curl)
      if (!origin) {
        return callback(null, true);
      }

      // If ALLOWED_ORIGINS is set, check against the list
      if (allowedOrigins.length > 0) {
        if (allowedOrigins.includes(origin)) {
          return callback(null, true);
        }

        // Also support wildcard patterns for PR previews
        // Example: https://*.vercel.app or https://*.railway.app
        const isAllowed = allowedOrigins.some(allowed => {
          if (allowed.includes('*')) {
            // Escape dots first, then replace * with .*
            const pattern = allowed
              .replace(/\./g, '\\.')  // Escape literal dots
              .replace(/\*/g, '.*');  // Replace * with .*
            const regex = new RegExp(`^${pattern}$`);
            return regex.test(origin);
          }
          return false;
        });

        if (isAllowed) {
          return callback(null, true);
        }

        return callback(new Error('Not allowed by CORS'));
      }

      // If no ALLOWED_ORIGINS is set, allow all origins (development mode)
      return callback(null, true);
    },
    credentials: true,
  }));

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
