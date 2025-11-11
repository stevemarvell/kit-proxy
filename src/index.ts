import dotenv from 'dotenv';
import { createApp } from './app';
import { FileSchemaRepository } from './repositories/FileSchemaRepository';
import * as path from 'path';

dotenv.config();

const PORT = process.env.PORT || 3000;
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, '../data');

// Initialize repository
const schemaRepository = new FileSchemaRepository(DATA_DIR);

// Create and start the app
const app = createApp(schemaRepository);

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Data directory: ${DATA_DIR}`);
});
