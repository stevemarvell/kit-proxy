import { Router, Request, Response } from 'express';
import { ConvertKitClient } from '../types/convertkit';
import { SchemaRepository } from '../types/schema';
import Ajv, { ValidateFunction, ErrorObject } from 'ajv';
import addFormats from 'ajv-formats';

const ajv = new Ajv();
addFormats(ajv);

// Cache for compiled validators to prevent memory leaks
// Key: formId, Value: compiled validator function
const validatorCache = new Map<string, ValidateFunction>();

/**
 * Sanitize AJV validation errors to avoid exposing internal paths
 */
export function sanitizeValidationErrors(errors: ErrorObject[] | null | undefined): unknown[] {
  if (!errors) return [];

  return errors.map(error => ({
    field: error.instancePath || error.schemaPath,
    message: error.message || 'Validation error',
    // Only include safe properties, exclude internal details
  }));
}

export function createSubscribeRouter(
  convertKitClient: ConvertKitClient,
  schemaRepository: SchemaRepository
): Router {
  const router = Router();

  router.post('/subscribe/:formId', async (req: Request, res: Response) => {
    try {
      const { formId } = req.params;

      // Validate formId
      if (!formId || formId.trim() === '') {
        return res.status(400).json({ error: 'Invalid formId parameter' });
      }

      // Get schema for validation
      const schema = await schemaRepository.getSchemaByFormId(formId);
      if (!schema) {
        return res.status(404).json({ error: 'Schema not found for the given formId' });
      }

      // Get or compile validator (with caching to prevent memory leaks)
      let validate = validatorCache.get(formId);
      if (!validate) {
        validate = ajv.compile(schema);
        validatorCache.set(formId, validate);
      }

      const valid = validate(req.body);

      if (!valid) {
        return res.status(400).json({
          error: 'Validation failed',
          details: sanitizeValidationErrors(validate.errors),
        });
      }

      // Subscribe via ConvertKit client
      const result = await convertKitClient.subscribe(formId, req.body);

      if (result.success) {
        return res.status(201).json({
          success: true,
          message: result.message || 'Subscription successful',
          subscriberId: result.subscriberId,
        });
      } else {
        // Note: This path is reachable when ConvertKit client returns success=false
        // This can happen when the API call fails or returns an error response
        return res.status(500).json({
          error: result.message || 'Subscription failed',
        });
      }
    } catch (error) {
      return res.status(500).json({ error: 'Internal server error' });
    }
  });

  return router;
}

/**
 * Clear the validator cache (useful for testing or schema updates)
 */
export function clearValidatorCache(): void {
  validatorCache.clear();
}
