import dotenv from 'dotenv';
import { createApp } from './app';
import { FileSchemaRepository } from './repositories/FileSchemaRepository';
import * as path from 'path';

dotenv.config();

// Validate environment variables
function validateEnvironment(): void {
  const required = ['PORT', 'DATA_DIR'];
  const missing: string[] = [];

  // PORT and DATA_DIR have defaults, but validate if explicitly set
  if (process.env.PORT && isNaN(Number(process.env.PORT))) {
    throw new Error('PORT must be a valid number');
  }

  // Note: CONVERTKIT_API_KEY would be required here when API integration is added
  // Example:
  // if (!process.env.CONVERTKIT_API_KEY) {
  //   missing.push('CONVERTKIT_API_KEY');
  // }

  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
}

// Log startup info
function logStartup(port: number | string, dataDir: string): void {
  const startupInfo = {
    timestamp: new Date().toISOString(),
    port,
    dataDir,
    nodeEnv: process.env.NODE_ENV || 'development',
  };

  if (process.env.NODE_ENV === 'production') {
    // Structured JSON logging for production
    console.log(JSON.stringify({ message: 'Server started', ...startupInfo }));
  } else {
    // Human-readable logging for development
    console.log('========================================');
    console.log(`Server started at ${startupInfo.timestamp}`);
    console.log(`Environment: ${startupInfo.nodeEnv}`);
    console.log(`Port: ${startupInfo.port}`);
    console.log(`Data directory: ${startupInfo.dataDir}`);
    console.log('========================================');
  }
}

// Validate environment before starting
validateEnvironment();

const PORT = process.env.PORT || 3000;
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, '../data');

// Initialize repository
const schemaRepository = new FileSchemaRepository(DATA_DIR);

// Create and start the app
const app = createApp(schemaRepository);

app.listen(PORT, () => {
  logStartup(PORT, DATA_DIR);
});
