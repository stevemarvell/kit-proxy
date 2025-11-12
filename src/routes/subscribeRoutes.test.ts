import request from 'supertest';
import express from 'express';
import { createSubscribeRouter } from './subscribeRoutes';
import { FileSchemaRepository } from '../repositories/FileSchemaRepository';
import { LoggingConvertKitClient } from '../clients/LoggingConvertKitClient';
import { promises as fs } from 'fs';
import * as path from 'path';

// Chicago-style testing: use real dependencies
describe('Subscribe Routes - Integration', () => {
  let app: express.Express;
  let tempDir: string;
  let repository: FileSchemaRepository;
  let client: LoggingConvertKitClient;
  let consoleLogSpy: jest.SpyInstance;

  beforeEach(async () => {
    tempDir = path.join(__dirname, '../../test-data-subscribe');
    await fs.mkdir(tempDir, { recursive: true });

    repository = new FileSchemaRepository(tempDir);
    client = new LoggingConvertKitClient();

    app = express();
    app.use(express.json());
    app.use('/api', createSubscribeRouter(client, repository));

    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
    consoleLogSpy.mockRestore();
  });

  describe('POST /api/subscribe/:formId', () => {
    it('should accept valid subscription data', async () => {
      const schema = {
        type: 'object',
        properties: {
          email: { type: 'string', format: 'email' },
          firstName: { type: 'string' },
        },
        required: ['email'],
      };

      await fs.writeFile(
        path.join(tempDir, 'newsletter.schema.json'),
        JSON.stringify(schema)
      );

      const response = await request(app)
        .post('/api/subscribe/newsletter')
        .send({
          email: 'test@example.com',
          firstName: 'John',
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.subscriberId).toMatch(/^mock-\d+$/);
      expect(consoleLogSpy).toHaveBeenCalled();
    });

    it('should return 404 when schema not found', async () => {
      const response = await request(app)
        .post('/api/subscribe/non-existent')
        .send({ email: 'test@example.com' });

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Schema not found for the given formId');
    });

    it('should return 400 for invalid email format', async () => {
      const schema = {
        type: 'object',
        properties: {
          email: { type: 'string', format: 'email' },
        },
        required: ['email'],
      };

      await fs.writeFile(
        path.join(tempDir, 'test-form.schema.json'),
        JSON.stringify(schema)
      );

      const response = await request(app)
        .post('/api/subscribe/test-form')
        .send({ email: 'invalid-email' });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Validation failed');
      expect(response.body.details).toBeDefined();
    });

    it('should return 400 for missing required fields', async () => {
      const schema = {
        type: 'object',
        properties: {
          email: { type: 'string', format: 'email' },
          firstName: { type: 'string' },
        },
        required: ['email', 'firstName'],
      };

      await fs.writeFile(
        path.join(tempDir, 'test-form.schema.json'),
        JSON.stringify(schema)
      );

      const response = await request(app)
        .post('/api/subscribe/test-form')
        .send({ email: 'test@example.com' });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Validation failed');
    });

    it('should return 400 for empty formId', async () => {
      const response = await request(app)
        .post('/api/subscribe/%20')
        .send({ email: 'test@example.com' });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Invalid formId parameter');
    });

    it('should accept complex subscriber data with tags', async () => {
      const schema = {
        type: 'object',
        properties: {
          email: { type: 'string', format: 'email' },
          firstName: { type: 'string' },
          lastName: { type: 'string' },
          tags: { type: 'array', items: { type: 'string' } },
        },
        required: ['email'],
      };

      await fs.writeFile(
        path.join(tempDir, 'advanced.schema.json'),
        JSON.stringify(schema)
      );

      const response = await request(app)
        .post('/api/subscribe/advanced')
        .send({
          email: 'advanced@example.com',
          firstName: 'Jane',
          lastName: 'Smith',
          tags: ['newsletter', 'vip'],
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
    });

    it('should handle validation errors for invalid JSON schema', async () => {
      const schema = {
        type: 'object',
        properties: {
          email: { type: 'string', format: 'email' },
          age: { type: 'number', minimum: 0, maximum: 120 },
        },
        required: ['email'],
      };

      await fs.writeFile(
        path.join(tempDir, 'age-form.schema.json'),
        JSON.stringify(schema)
      );

      const response = await request(app)
        .post('/api/subscribe/age-form')
        .send({
          email: 'test@example.com',
          age: 150, // Invalid: exceeds maximum
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Validation failed');
    });

    it('should return 500 on repository error', async () => {
      // Create a directory instead of a file to cause an error
      const schemaPath = path.join(tempDir, 'error-form.schema.json');
      await fs.mkdir(schemaPath);

      const response = await request(app)
        .post('/api/subscribe/error-form')
        .send({ email: 'test@example.com' });

      expect(response.status).toBe(500);
      expect(response.body.error).toBe('Internal server error');
    });

    it('should return 500 when ConvertKit client returns failure', async () => {
      const schema = {
        type: 'object',
        properties: {
          email: { type: 'string', format: 'email' },
        },
        required: ['email'],
      };

      await fs.writeFile(
        path.join(tempDir, 'fail-form.schema.json'),
        JSON.stringify(schema)
      );

      // Create a failing client
      const failingClient = {
        subscribe: jest.fn().mockResolvedValue({
          success: false,
          message: 'API error occurred',
        }),
      };

      const failApp = express();
      failApp.use(express.json());
      failApp.use('/api', createSubscribeRouter(failingClient, repository));

      const response = await request(failApp)
        .post('/api/subscribe/fail-form')
        .send({ email: 'fail@example.com' });

      expect(response.status).toBe(500);
      expect(response.body.error).toBe('API error occurred');
    });

    it('should use default message when ConvertKit client returns failure without message', async () => {
      const schema = {
        type: 'object',
        properties: {
          email: { type: 'string', format: 'email' },
        },
        required: ['email'],
      };

      await fs.writeFile(
        path.join(tempDir, 'fail-form2.schema.json'),
        JSON.stringify(schema)
      );

      // Create a failing client without message
      const failingClient = {
        subscribe: jest.fn().mockResolvedValue({
          success: false,
        }),
      };

      const failApp = express();
      failApp.use(express.json());
      failApp.use('/api', createSubscribeRouter(failingClient, repository));

      const response = await request(failApp)
        .post('/api/subscribe/fail-form2')
        .send({ email: 'fail@example.com' });

      expect(response.status).toBe(500);
      expect(response.body.error).toBe('Subscription failed');
    });

    it('should use default success message when client returns success without message', async () => {
      const schema = {
        type: 'object',
        properties: {
          email: { type: 'string', format: 'email' },
        },
        required: ['email'],
      };

      await fs.writeFile(
        path.join(tempDir, 'default-msg.schema.json'),
        JSON.stringify(schema)
      );

      // Create a client without message
      const clientWithoutMsg = {
        subscribe: jest.fn().mockResolvedValue({
          success: true,
          subscriberId: 'test-123',
        }),
      };

      const testApp = express();
      testApp.use(express.json());
      testApp.use('/api', createSubscribeRouter(clientWithoutMsg, repository));

      const response = await request(testApp)
        .post('/api/subscribe/default-msg')
        .send({ email: 'test@example.com' });

      expect(response.status).toBe(201);
      expect(response.body.message).toBe('Subscription successful');
    });
  });
});
