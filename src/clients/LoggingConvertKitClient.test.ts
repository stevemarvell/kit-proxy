import { LoggingConvertKitClient } from './LoggingConvertKitClient';
import { SubscriberData } from '../types/convertkit';

describe('LoggingConvertKitClient', () => {
  let client: LoggingConvertKitClient;
  let consoleLogSpy: jest.SpyInstance;
  let originalNodeEnv: string | undefined;

  beforeEach(() => {
    client = new LoggingConvertKitClient();
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
    originalNodeEnv = process.env.NODE_ENV;
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
    process.env.NODE_ENV = originalNodeEnv;
  });

  describe('subscribe', () => {
    it('should log subscriber data in development mode', async () => {
      process.env.NODE_ENV = 'development';
      const subscriberData: SubscriberData = {
        email: 'test@example.com',
        firstName: 'John',
        lastName: 'Doe',
      };

      const result = await client.subscribe('test-form', subscriberData);

      expect(consoleLogSpy).toHaveBeenCalledWith('=== ConvertKit Subscribe Request ===');
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Form ID: test-form'));
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Email: test@example.com'));
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('First Name: John'));
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Last Name: Doe'));
      expect(result.success).toBe(true);
      expect(result.subscriberId).toMatch(/^mock-\d+$/);
    });

    it('should log as JSON in production mode', async () => {
      process.env.NODE_ENV = 'production';
      const subscriberData: SubscriberData = {
        email: 'prod@example.com',
      };

      const result = await client.subscribe('prod-form', subscriberData);

      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('"action":"subscribe"'));
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('"formId":"prod-form"'));
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('"email":"prod@example.com"'));
      expect(result.success).toBe(true);
    });

    it('should log tags when provided', async () => {
      process.env.NODE_ENV = 'development';
      const subscriberData: SubscriberData = {
        email: 'test@example.com',
        tags: ['newsletter', 'blog'],
      };

      await client.subscribe('test-form', subscriberData);

      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Tags: newsletter, blog'));
    });

    it('should log custom fields when provided', async () => {
      process.env.NODE_ENV = 'development';
      const subscriberData: SubscriberData = {
        email: 'test@example.com',
        customFields: { company: 'Acme Inc', role: 'Developer' },
      };

      await client.subscribe('test-form', subscriberData);

      expect(consoleLogSpy).toHaveBeenCalledWith('Custom Fields:', { company: 'Acme Inc', role: 'Developer' });
    });

    it('should return success response with mock subscriber ID', async () => {
      const subscriberData: SubscriberData = {
        email: 'test@example.com',
      };

      const result = await client.subscribe('test-form', subscriberData);

      expect(result.success).toBe(true);
      expect(result.subscriberId).toBeDefined();
      expect(result.subscriberId).toMatch(/^mock-\d+$/);
      expect(result.message).toBe('Subscriber logged (not actually subscribed)');
    });

    it('should handle minimal subscriber data', async () => {
      process.env.NODE_ENV = 'development';
      const subscriberData: SubscriberData = {
        email: 'minimal@example.com',
      };

      const result = await client.subscribe('minimal-form', subscriberData);

      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Email: minimal@example.com'));
      expect(result.success).toBe(true);
    });
  });
});
