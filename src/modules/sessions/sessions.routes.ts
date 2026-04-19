import { Router } from 'express';
import { body } from 'express-validator';
import { validate } from '../../middleware/validate';
import { createSession, getSession, updateSession } from './sessions.controller';

export const sessionsRouter = Router();

/**
 * POST /api/sessions
 */
sessionsRouter.post(
  '/',
  [
    body('preferences').optional().isObject(),
  ],
  validate,
  createSession
);

/**
 * GET /api/sessions/:id
 */
sessionsRouter.get('/:id', getSession);

/**
 * PATCH /api/sessions/:id
 */
sessionsRouter.patch(
  '/:id',
  [
    body('preferences').optional().isObject(),
    body('shortlist').optional().isArray(),
    body('messages').optional().isArray(),
  ],
  validate,
  updateSession
);
