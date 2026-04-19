import { Request, Response, NextFunction } from 'express';
import { analyticsService } from './analytics.service';

export async function getPopular(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 10;
    const data = await analyticsService.getPopular(limit);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

export async function getStats(
  _req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const data = await analyticsService.getStats();
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}
