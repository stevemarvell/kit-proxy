import { Request, Response, NextFunction } from 'express';
import { errorHandler } from './errorHandler';

describe('Error Handler Middleware', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;
  let consoleErrorSpy: jest.SpyInstance;
  let originalNodeEnv: string | undefined;

  beforeEach(() => {
    originalNodeEnv = process.env.NODE_ENV;
    mockRequest = {
      method: 'GET',
      path: '/api/test',
    };
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      headersSent: false,
    };
    mockNext = jest.fn();
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
    process.env.NODE_ENV = originalNodeEnv;
  });

  it('should log error and return 500 status in development', () => {
    process.env.NODE_ENV = 'development';
    const error = new Error('Test error');

    errorHandler(
      error,
      mockRequest as Request,
      mockResponse as Response,
      mockNext
    );

    expect(consoleErrorSpy).toHaveBeenCalledWith('Error:', expect.objectContaining({
      method: 'GET',
      path: '/api/test',
      error: 'Test error',
    }));
    expect(mockResponse.status).toHaveBeenCalledWith(500);
    expect(mockResponse.json).toHaveBeenCalledWith({ error: 'Internal server error' });
    expect(mockNext).not.toHaveBeenCalled();
  });

  it('should log as JSON in production', () => {
    process.env.NODE_ENV = 'production';
    const error = new Error('Production error');

    errorHandler(
      error,
      mockRequest as Request,
      mockResponse as Response,
      mockNext
    );

    expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('"error":"Production error"'));
    expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('"method":"GET"'));
    expect(mockResponse.status).toHaveBeenCalledWith(500);
  });

  it('should call next if headers already sent', () => {
    const error = new Error('Test error');
    mockResponse.headersSent = true;

    errorHandler(
      error,
      mockRequest as Request,
      mockResponse as Response,
      mockNext
    );

    expect(mockNext).toHaveBeenCalledWith(error);
    expect(mockResponse.status).not.toHaveBeenCalled();
    expect(mockResponse.json).not.toHaveBeenCalled();
  });

  it('should handle errors without a message', () => {
    process.env.NODE_ENV = 'development';
    const error = new Error();

    errorHandler(
      error,
      mockRequest as Request,
      mockResponse as Response,
      mockNext
    );

    expect(consoleErrorSpy).toHaveBeenCalledWith('Error:', expect.objectContaining({
      error: '',
    }));
    expect(mockResponse.status).toHaveBeenCalledWith(500);
  });
});
