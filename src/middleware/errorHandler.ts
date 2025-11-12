import { Request, Response, NextFunction } from 'express';

export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  // Log error with timestamp and request info
  const timestamp = new Date().toISOString();
  const errorLog = {
    timestamp,
    method: req.method,
    path: req.path,
    error: err.message,
    stack: process.env.NODE_ENV !== 'production' ? err.stack : undefined,
  };

  if (process.env.NODE_ENV === 'production') {
    // In production, log as JSON for structured logging
    console.error(JSON.stringify(errorLog));
  } else {
    // In development, log with more detail
    console.error('Error:', errorLog);
  }

  // Don't respond if headers already sent
  if (res.headersSent) {
    return next(err);
  }

  res.status(500).json({ error: 'Internal server error' });
}
