import { Request, Response, NextFunction } from 'express';
import { recommendationService } from './recommendation.service';
import { RecommendationPreferences } from './recommendation.types';
import { createError } from '../../middleware/errorHandler';

export async function getRecommendations(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const prefs: RecommendationPreferences = req.body;
    const result = await recommendationService.recommend(prefs);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

export async function getSessionRecommendations(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { sessionId } = req.params;
    const result = await recommendationService.getSessionRecommendations(sessionId);
    if (!result) return next(createError(`Session ${sessionId} not found`, 404));
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}
