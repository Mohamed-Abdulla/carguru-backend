import { Request, Response, NextFunction } from 'express';
import { sessionsService } from './sessions.service';
import { createError } from '../../middleware/errorHandler';
import { CreateSessionDto, UpdateSessionDto } from './sessions.types';

export async function createSession(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const dto: CreateSessionDto = req.body;
    const session = await sessionsService.create(dto);
    res.status(201).json({ success: true, data: session });
  } catch (err) {
    next(err);
  }
}

export async function getSession(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { id } = req.params;
    const session = await sessionsService.findById(id);
    if (!session) return next(createError(`Session ${id} not found`, 404));
    res.json({ success: true, data: session });
  } catch (err) {
    next(err);
  }
}

export async function updateSession(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { id } = req.params;
    const dto: UpdateSessionDto = req.body;

    const existing = await sessionsService.findById(id);
    if (!existing) return next(createError(`Session ${id} not found`, 404));

    const updated = await sessionsService.update(id, dto);
    res.json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
}
