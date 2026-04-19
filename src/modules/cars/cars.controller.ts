import { Request, Response, NextFunction } from 'express';
import { carsService } from './cars.service';
import { createError } from '../../middleware/errorHandler';

export async function getAllCars(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const {
      budget_min,
      budget_max,
      fuel_type,
      body_type,
      seats_min,
      use_case,
      transmission,
      safety_min,
      limit,
      offset,
    } = req.query as Record<string, string | undefined>;

    const result = await carsService.findAll({
      budget_min: budget_min ? parseFloat(budget_min) : undefined,
      budget_max: budget_max ? parseFloat(budget_max) : undefined,
      fuel_type,
      body_type,
      seats_min: seats_min ? parseInt(seats_min, 10) : undefined,
      use_case,
      transmission,
      safety_min: safety_min ? parseInt(safety_min, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : 50,
      offset: offset ? parseInt(offset, 10) : 0,
    });

    res.json({
      success: true,
      data: result.data,
      meta: {
        total: result.total,
        limit: limit ? parseInt(limit, 10) : 50,
        offset: offset ? parseInt(offset, 10) : 0,
      },
    });
  } catch (err) {
    next(err);
  }
}

export async function getCarById(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return next(createError('Invalid car ID', 400));

    const car = await carsService.findById(id);
    if (!car) return next(createError(`Car with id ${id} not found`, 404));

    res.json({ success: true, data: car });
  } catch (err) {
    next(err);
  }
}
