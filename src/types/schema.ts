export interface JSONSchemaProperty {
  type: string;
  format?: string;
  minLength?: number;
  maxLength?: number;
  description?: string;
  items?: JSONSchemaProperty;
  enum?: string[];
  pattern?: string;
  minimum?: number;
  maximum?: number;
  [key: string]: unknown;
}

export interface JSONSchema {
  $schema?: string;
  type: string;
  properties?: Record<string, JSONSchemaProperty>;
  required?: string[];
  additionalProperties?: boolean;
  items?: JSONSchemaProperty;
  description?: string;
  title?: string;
  [key: string]: unknown;
}

export interface SchemaRepository {
  getSchemaByFormId(formId: string): Promise<JSONSchema | null>;
}
