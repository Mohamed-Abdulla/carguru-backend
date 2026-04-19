import { Router } from 'express';
import { getAllCars, getCarById } from './cars.controller';

export const carsRouter = Router();

/**
 * GET /api/cars
 * Query: budget_min, budget_max, fuel_type, body_type, seats_min,
 *        use_case, transmission, safety_min, limit, offset
 */
carsRouter.get('/', getAllCars);

/**
 * GET /api/cars/:id
 */
carsRouter.get('/:id', getCarById);
