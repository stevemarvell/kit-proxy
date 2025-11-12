import request from 'supertest';
import { createApp } from './app';
import { FileSchemaRepository } from './repositories/FileSchemaRepository';
import { LoggingConvertKitClient } from './clients/LoggingConvertKitClient';
import { promises as fs } from 'fs';
import * as path from 'path';

// Chicago-style testing: use real dependencies
describe('App - Integration', () => {
  let tempDir: string;
  let repository: FileSchemaRepository;
  let client: LoggingConvertKitClient;

  beforeEach(async () => {
    tempDir = path.join(__dirname, '../test-data-app');
    await fs.mkdir(tempDir, { recursive: true });
    repository = new FileSchemaRepository(tempDir);
    client = new LoggingConvertKitClient();
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  describe('Health Check', () => {
    it('should return 200 on /health endpoint', async () => {
      const app = createApp(repository, client);
      const response = await request(app).get('/health');

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ status: 'ok' });
    });
  });

  describe('Schema API', () => {
    it('should integrate with schema routes', async () => {
      const mockSchema = {
        type: 'object',
        properties: {
          name: { type: 'string' },
        },
      };

      await fs.writeFile(
        path.join(tempDir, 'test-form.schema.json'),
        JSON.stringify(mockSchema)
      );

      const app = createApp(repository, client);
      const response = await request(app).get('/api/schema/test-form');

      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockSchema);
    });

    it('should handle errors from repository', async () => {
      await fs.writeFile(
        path.join(tempDir, 'bad.schema.json'),
        'not valid json'
      );

      const app = createApp(repository, client);
      const response = await request(app).get('/api/schema/bad');

      expect(response.status).toBe(500);
      expect(response.body).toEqual({ error: 'Internal server error' });
    });
  });

  describe('Subscribe API', () => {
    it('should integrate with subscribe routes', async () => {
      const schema = {
        type: 'object',
        properties: {
          email: { type: 'string', format: 'email' },
        },
        required: ['email'],
      };

      await fs.writeFile(
        path.join(tempDir, 'newsletter.schema.json'),
        JSON.stringify(schema)
      );

      const app = createApp(repository, client);
      const response = await request(app)
        .post('/api/subscribe/newsletter')
        .send({ email: 'integration@example.com' });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
    });
  });
});
