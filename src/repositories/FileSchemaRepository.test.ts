import { FileSchemaRepository } from './FileSchemaRepository';
import { promises as fs } from 'fs';
import * as path from 'path';

// Chicago-style testing: use real file system
describe('FileSchemaRepository - Integration', () => {
  let repository: FileSchemaRepository;
  let tempDir: string;

  beforeEach(async () => {
    tempDir = path.join(__dirname, '../../test-data-repo');
    await fs.mkdir(tempDir, { recursive: true });
    repository = new FileSchemaRepository(tempDir);
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  describe('getSchemaByFormId', () => {
    it('should return schema when file exists', async () => {
      const mockSchema = {
        type: 'object',
        properties: {
          email: { type: 'string' },
        },
      };

      await fs.writeFile(
        path.join(tempDir, 'test-form.schema.json'),
        JSON.stringify(mockSchema)
      );

      const result = await repository.getSchemaByFormId('test-form');

      expect(result).toEqual(mockSchema);
    });

    it('should return null when file does not exist', async () => {
      const result = await repository.getSchemaByFormId('non-existent');
      expect(result).toBeNull();
    });

    it('should throw error for invalid JSON', async () => {
      await fs.writeFile(
        path.join(tempDir, 'invalid.schema.json'),
        'not valid json'
      );

      await expect(repository.getSchemaByFormId('invalid')).rejects.toThrow();
    });

    it('should throw error for file system errors other than ENOENT', async () => {
      // Create a directory with the schema file name to cause an error
      const schemaPath = path.join(tempDir, 'test.schema.json');
      await fs.mkdir(schemaPath);

      await expect(repository.getSchemaByFormId('test')).rejects.toThrow();
    });
  });

  describe('Security - Path Traversal Prevention', () => {
    it('should reject formId with path traversal attempt (../)', async () => {
      await expect(
        repository.getSchemaByFormId('../../../etc/passwd')
      ).rejects.toThrow('Invalid formId: must contain only alphanumeric characters, hyphens, and underscores');
    });

    it('should reject formId with absolute path', async () => {
      await expect(
        repository.getSchemaByFormId('/etc/passwd')
      ).rejects.toThrow('Invalid formId: must contain only alphanumeric characters, hyphens, and underscores');
    });

    it('should reject formId with forward slashes', async () => {
      await expect(
        repository.getSchemaByFormId('../../secret')
      ).rejects.toThrow('Invalid formId: must contain only alphanumeric characters, hyphens, and underscores');
    });

    it('should reject formId with backslashes', async () => {
      await expect(
        repository.getSchemaByFormId('..\\..\\secret')
      ).rejects.toThrow('Invalid formId: must contain only alphanumeric characters, hyphens, and underscores');
    });

    it('should reject formId with special characters', async () => {
      await expect(
        repository.getSchemaByFormId('test@file')
      ).rejects.toThrow('Invalid formId: must contain only alphanumeric characters, hyphens, and underscores');
    });

    it('should reject formId with spaces', async () => {
      await expect(
        repository.getSchemaByFormId('test file')
      ).rejects.toThrow('Invalid formId: must contain only alphanumeric characters, hyphens, and underscores');
    });

    it('should accept valid formId with hyphens', async () => {
      const mockSchema = { type: 'object', properties: {} };
      await fs.writeFile(
        path.join(tempDir, 'contact-form.schema.json'),
        JSON.stringify(mockSchema)
      );

      const result = await repository.getSchemaByFormId('contact-form');
      expect(result).toEqual(mockSchema);
    });

    it('should accept valid formId with underscores', async () => {
      const mockSchema = { type: 'object', properties: {} };
      await fs.writeFile(
        path.join(tempDir, 'contact_form.schema.json'),
        JSON.stringify(mockSchema)
      );

      const result = await repository.getSchemaByFormId('contact_form');
      expect(result).toEqual(mockSchema);
    });

    it('should accept valid formId with alphanumeric characters', async () => {
      const mockSchema = { type: 'object', properties: {} };
      await fs.writeFile(
        path.join(tempDir, 'form123.schema.json'),
        JSON.stringify(mockSchema)
      );

      const result = await repository.getSchemaByFormId('form123');
      expect(result).toEqual(mockSchema);
    });
  });
});
