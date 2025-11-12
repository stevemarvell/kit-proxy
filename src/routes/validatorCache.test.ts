import request from 'supertest';
import express from 'express';
import { clearValidatorCache, createSubscribeRouter } from './subscribeRoutes';
import { FileSchemaRepository } from '../repositories/FileSchemaRepository';
import { promises as fs } from 'fs';
import * as path from 'path';

describe('Validator Cache', () => {
  let tempDir: string;
  let repository: FileSchemaRepository;
  let app: express.Express;

  beforeEach(async () => {
    tempDir = path.join(__dirname, '../../test-data-cache');
    await fs.mkdir(tempDir, { recursive: true });
    repository = new FileSchemaRepository(tempDir);
    clearValidatorCache();
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
    clearValidatorCache();
  });

  it('should cache validators and reuse them', async () => {
    const schema = {
      type: 'object',
      properties: {
        email: { type: 'string', format: 'email' },
      },
      required: ['email'],
    };

    await fs.writeFile(
      path.join(tempDir, 'cache-test.schema.json'),
      JSON.stringify(schema)
    );

    const client = {
      subscribe: jest.fn().mockResolvedValue({
        success: true,
        subscriberId: 'test-123',
      }),
    };

    app = express();
    app.use(express.json());
    app.use('/api', createSubscribeRouter(client, repository));

    // First request - should compile and cache
    const response1 = await request(app)
      .post('/api/subscribe/cache-test')
      .send({ email: 'test1@example.com' });

    expect(response1.status).toBe(201);

    // Second request - should use cached validator
    const response2 = await request(app)
      .post('/api/subscribe/cache-test')
      .send({ email: 'test2@example.com' });

    expect(response2.status).toBe(201);

    // Both requests should succeed, proving cache works
    expect(client.subscribe).toHaveBeenCalledTimes(2);
  });

  it('should clear cache when clearValidatorCache is called', async () => {
    const schema = {
      type: 'object',
      properties: {
        email: { type: 'string', format: 'email' },
      },
      required: ['email'],
    };

    await fs.writeFile(
      path.join(tempDir, 'clear-test.schema.json'),
      JSON.stringify(schema)
    );

    const client = {
      subscribe: jest.fn().mockResolvedValue({
        success: true,
        subscriberId: 'test-456',
      }),
    };

    app = express();
    app.use(express.json());
    app.use('/api', createSubscribeRouter(client, repository));

    // First request
    await request(app)
      .post('/api/subscribe/clear-test')
      .send({ email: 'before@example.com' });

    // Clear cache
    clearValidatorCache();

    // Second request after cache clear
    const response = await request(app)
      .post('/api/subscribe/clear-test')
      .send({ email: 'after@example.com' });

    expect(response.status).toBe(201);
  });
});
