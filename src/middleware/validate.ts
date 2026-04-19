import { Request, Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';
import { createError } from './errorHandler';

/**
 * Run after express-validator chains — collects errors and passes them to the error handler.
 */
export function validate(req: Request, _res: Response, next: NextFunction): void {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const messages = errors
      .array()
      .map((e) => e.msg)
      .join('; ');
    return next(createError(`Validation failed: ${messages}`, 422));
  }
  next();
}
