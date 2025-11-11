import { Router, Request, Response } from 'express';
import { SchemaRepository } from '../types/schema';

export function createSchemaRouter(schemaRepository: SchemaRepository): Router {
  const router = Router();

  router.get('/schema/:formId', async (req: Request, res: Response) => {
    try {
      const { formId } = req.params;

      if (!formId || formId.trim() === '') {
        return res.status(400).json({ error: 'Invalid formId parameter' });
      }

      const schema = await schemaRepository.getSchemaByFormId(formId);

      if (!schema) {
        return res.status(404).json({ error: 'Schema not found for the given formId' });
      }

      return res.status(200).json(schema);
    } catch (error) {
      return res.status(500).json({ error: 'Internal server error' });
    }
  });

  return router;
}
