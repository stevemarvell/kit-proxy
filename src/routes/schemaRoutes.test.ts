import request from 'supertest';
import express from 'express';
import { createSchemaRouter } from './schemaRoutes';
import { FileSchemaRepository } from '../repositories/FileSchemaRepository';
import { promises as fs } from 'fs';
import * as path from 'path';

// Chicago-style testing: use real repository with temp directory
describe('Schema Routes - Integration', () => {
  let app: express.Express;
  let tempDir: string;
  let repository: FileSchemaRepository;

  beforeEach(async () => {
    tempDir = path.join(__dirname, '../../test-data');
    await fs.mkdir(tempDir, { recursive: true });

    repository = new FileSchemaRepository(tempDir);

    app = express();
    app.use(express.json());
    app.use('/api', createSchemaRouter(repository));
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  describe('GET /api/schema/:formId', () => {
    it('should return schema when found', async () => {
      const mockSchema = {
        type: 'object',
        properties: {
          email: { type: 'string' },
        },
      };

      await fs.writeFile(
        path.join(tempDir, 'contact-form.schema.json'),
        JSON.stringify(mockSchema)
      );

      const response = await request(app).get('/api/schema/contact-form');

      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockSchema);
    });

    it('should return 404 when schema not found', async () => {
      const response = await request(app).get('/api/schema/non-existent');

      expect(response.status).toBe(404);
      expect(response.body).toEqual({ error: 'Schema not found for the given formId' });
    });

    it('should return 500 on repository error (invalid JSON)', async () => {
      await fs.writeFile(
        path.join(tempDir, 'invalid.schema.json'),
        'invalid json content'
      );

      const response = await request(app).get('/api/schema/invalid');

      expect(response.status).toBe(500);
      expect(response.body).toEqual({ error: 'Internal server error' });
    });

    it('should return 400 for whitespace-only formId', async () => {
      const response = await request(app).get('/api/schema/%20%20');

      expect(response.status).toBe(400);
      expect(response.body).toEqual({ error: 'Invalid formId parameter' });
    });
  });
});
