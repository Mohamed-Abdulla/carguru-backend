import { Router } from 'express';
import { getPopular, getStats } from './analytics.controller';

export const analyticsRouter = Router();

/**
 * GET /api/analytics/popular?limit=10
 */
analyticsRouter.get('/popular', getPopular);

/**
 * GET /api/analytics/stats
 */
analyticsRouter.get('/stats', getStats);
