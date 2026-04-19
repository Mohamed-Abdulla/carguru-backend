import { Router } from 'express';
import { body } from 'express-validator';
import { validate } from '../../middleware/validate';
import {
  getRecommendations,
  getSessionRecommendations,
} from './recommendation.controller';

export const recommendationsRouter = Router();

/**
 * POST /api/recommendations
 * Body: RecommendationPreferences
 */
recommendationsRouter.post(
  '/',
  [
    body('budget_max').optional().isFloat({ min: 1 }),
    body('budget_min').optional().isFloat({ min: 0 }),
    body('fuel_type').optional().isArray(),
    body('body_type').optional().isArray(),
    body('seats').optional().isInt({ min: 2, max: 9 }),
    body('use_case').optional().isArray(),
    body('priorities').optional().isArray(),
    body('transmission').optional().isIn(['Automatic', 'Manual']),
    body('top_n').optional().isInt({ min: 1, max: 20 }),
  ],
  validate,
  getRecommendations
);

/**
 * GET /api/recommendations/session/:sessionId
 */
recommendationsRouter.get('/session/:sessionId', getSessionRecommendations);
