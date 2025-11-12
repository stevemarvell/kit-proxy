import { Router, Request, Response } from 'express';
import { ConvertKitClient } from '../types/convertkit';
import { SchemaRepository } from '../types/schema';
import Ajv, { ValidateFunction } from 'ajv';
import addFormats from 'ajv-formats';

const ajv = new Ajv();
addFormats(ajv);

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

      // Validate request body against schema
      const validate: ValidateFunction = ajv.compile(schema);
      const valid = validate(req.body);

      if (!valid) {
        return res.status(400).json({
          error: 'Validation failed',
          details: validate.errors,
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
