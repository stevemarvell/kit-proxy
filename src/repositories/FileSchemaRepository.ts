import { promises as fs } from 'fs';
import * as path from 'path';
import { SchemaRepository, JSONSchema } from '../types/schema';

export class FileSchemaRepository implements SchemaRepository {
  constructor(private readonly dataDirectory: string) {}

  async getSchemaByFormId(formId: string): Promise<JSONSchema | null> {
    // Security: Strict input validation to prevent path traversal attacks
    // Only alphanumeric characters, hyphens, and underscores are allowed
    // This prevents: ../../../etc/passwd, /etc/passwd, \\.., etc.
    if (!/^[a-zA-Z0-9_-]+$/.test(formId)) {
      throw new Error('Invalid formId: must contain only alphanumeric characters, hyphens, and underscores');
    }

    try {
      const filePath = path.join(this.dataDirectory, `${formId}.schema.json`);
      const fileContent = await fs.readFile(filePath, 'utf-8');
      const schema = JSON.parse(fileContent);
      return schema;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        return null;
      }
      throw error;
    }
  }
}
