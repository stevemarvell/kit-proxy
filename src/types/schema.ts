export interface JSONSchema {
  $schema?: string;
  type: string;
  properties?: Record<string, any>;
  required?: string[];
  [key: string]: any;
}

export interface SchemaRepository {
  getSchemaByFormId(formId: string): Promise<JSONSchema | null>;
}
