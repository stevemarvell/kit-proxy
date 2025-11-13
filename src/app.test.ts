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

  describe('CORS Configuration', () => {
    let originalAllowedOrigins: string | undefined;

    beforeEach(() => {
      originalAllowedOrigins = process.env.ALLOWED_ORIGINS;
    });

    afterEach(() => {
      if (originalAllowedOrigins === undefined) {
        delete process.env.ALLOWED_ORIGINS;
      } else {
        process.env.ALLOWED_ORIGINS = originalAllowedOrigins;
      }
    });

    it('should allow all origins when ALLOWED_ORIGINS is not set', async () => {
      delete process.env.ALLOWED_ORIGINS;

      const app = createApp(repository, client);
      const response = await request(app)
        .get('/health')
        .set('Origin', 'https://example.com');

      expect(response.status).toBe(200);
      expect(response.headers['access-control-allow-origin']).toBe('https://example.com');
      expect(response.headers['access-control-allow-credentials']).toBe('true');
    });

    it('should allow requests with no origin header', async () => {
      process.env.ALLOWED_ORIGINS = 'https://myapp.com';

      const app = createApp(repository, client);
      const response = await request(app).get('/health');

      expect(response.status).toBe(200);
    });

    it('should allow specific origins when ALLOWED_ORIGINS is set', async () => {
      process.env.ALLOWED_ORIGINS = 'https://myapp.com,https://other.com';

      const app = createApp(repository, client);
      const response = await request(app)
        .get('/health')
        .set('Origin', 'https://myapp.com');

      expect(response.status).toBe(200);
      expect(response.headers['access-control-allow-origin']).toBe('https://myapp.com');
    });

    it('should block origins not in ALLOWED_ORIGINS', async () => {
      process.env.ALLOWED_ORIGINS = 'https://myapp.com';

      const app = createApp(repository, client);
      const response = await request(app)
        .get('/health')
        .set('Origin', 'https://evil.com');

      // CORS error is handled by the cors middleware and sanitized by error handler
      expect(response.status).toBe(500);
      expect(response.body).toEqual({ error: 'Internal server error' });
      // The actual CORS error is logged but not exposed to clients (security)
    });

    it('should support wildcard patterns for Vercel PR previews', async () => {
      process.env.ALLOWED_ORIGINS = 'https://*.vercel.app';

      const app = createApp(repository, client);
      const response = await request(app)
        .get('/health')
        .set('Origin', 'https://my-app-git-feature-user.vercel.app');

      expect(response.status).toBe(200);
      expect(response.headers['access-control-allow-origin']).toBe('https://my-app-git-feature-user.vercel.app');
    });

    it('should support wildcard patterns for Railway PR previews', async () => {
      process.env.ALLOWED_ORIGINS = 'https://*.railway.app';

      const app = createApp(repository, client);
      const response = await request(app)
        .get('/health')
        .set('Origin', 'https://my-app-pr-123.railway.app');

      expect(response.status).toBe(200);
      expect(response.headers['access-control-allow-origin']).toBe('https://my-app-pr-123.railway.app');
    });

    it('should support multiple origins including wildcards', async () => {
      process.env.ALLOWED_ORIGINS = 'http://localhost:3000,https://myapp.vercel.app,https://*.vercel.app';

      const app = createApp(repository, client);

      // Test localhost
      const localResponse = await request(app)
        .get('/health')
        .set('Origin', 'http://localhost:3000');
      expect(localResponse.status).toBe(200);
      expect(localResponse.headers['access-control-allow-origin']).toBe('http://localhost:3000');

      // Test production domain
      const prodResponse = await request(app)
        .get('/health')
        .set('Origin', 'https://myapp.vercel.app');
      expect(prodResponse.status).toBe(200);
      expect(prodResponse.headers['access-control-allow-origin']).toBe('https://myapp.vercel.app');

      // Test PR preview
      const prResponse = await request(app)
        .get('/health')
        .set('Origin', 'https://myapp-git-pr-456.vercel.app');
      expect(prResponse.status).toBe(200);
      expect(prResponse.headers['access-control-allow-origin']).toBe('https://myapp-git-pr-456.vercel.app');
    });

    it('should handle whitespace in ALLOWED_ORIGINS', async () => {
      process.env.ALLOWED_ORIGINS = ' https://myapp.com , https://other.com ';

      const app = createApp(repository, client);
      const response = await request(app)
        .get('/health')
        .set('Origin', 'https://myapp.com');

      expect(response.status).toBe(200);
      expect(response.headers['access-control-allow-origin']).toBe('https://myapp.com');
    });
  });
});
