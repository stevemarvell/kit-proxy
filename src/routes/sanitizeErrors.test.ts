import { ErrorObject } from 'ajv';
import { sanitizeValidationErrors } from './subscribeRoutes';

describe('Validation Error Sanitization', () => {
  it('should handle null errors gracefully', () => {
    const result = sanitizeValidationErrors(null);
    expect(result).toEqual([]);
  });

  it('should handle undefined errors gracefully', () => {
    const result = sanitizeValidationErrors(undefined);
    expect(result).toEqual([]);
  });

  it('should sanitize error objects to only include safe fields', () => {
    const mockErrors: ErrorObject[] = [
      {
        keyword: 'required',
        instancePath: '/email',
        schemaPath: '#/required',
        params: { missingProperty: 'email' },
        message: 'must have required property',
      } as ErrorObject,
    ];

    const result = sanitizeValidationErrors(mockErrors);

    expect(result).toEqual([
      {
        field: '/email',
        message: 'must have required property',
      },
    ]);
  });

  it('should use schemaPath when instancePath is empty', () => {
    const mockErrors: ErrorObject[] = [
      {
        keyword: 'type',
        instancePath: '',
        schemaPath: '#/properties/email/type',
        params: { type: 'string' },
        message: 'must be string',
      } as ErrorObject,
    ];

    const result = sanitizeValidationErrors(mockErrors);

    expect(result).toEqual([
      {
        field: '#/properties/email/type',
        message: 'must be string',
      },
    ]);
  });

  it('should use default message when error message is missing', () => {
    const mockErrors: ErrorObject[] = [
      {
        keyword: 'custom',
        instancePath: '/field',
        schemaPath: '#/properties/field',
        params: {},
        message: undefined,
      } as ErrorObject,
    ];

    const result = sanitizeValidationErrors(mockErrors);

    expect(result).toEqual([
      {
        field: '/field',
        message: 'Validation error',
      },
    ]);
  });

  it('should handle multiple errors', () => {
    const mockErrors: ErrorObject[] = [
      {
        keyword: 'required',
        instancePath: '',
        schemaPath: '#/required',
        params: { missingProperty: 'email' },
        message: 'must have required property email',
      } as ErrorObject,
      {
        keyword: 'format',
        instancePath: '/phone',
        schemaPath: '#/properties/phone/format',
        params: { format: 'phone' },
        message: undefined,
      } as ErrorObject,
    ];

    const result = sanitizeValidationErrors(mockErrors);

    expect(result).toEqual([
      {
        field: '#/required',
        message: 'must have required property email',
      },
      {
        field: '/phone',
        message: 'Validation error',
      },
    ]);
  });
});
