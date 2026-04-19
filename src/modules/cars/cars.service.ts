import { pool } from '../../db/pool';
import { Car, CarFilters } from './cars.types';

export class CarsService {
  async findAll(filters: CarFilters): Promise<{ data: Car[]; total: number }> {
    const conditions: string[] = [];
    const values: unknown[] = [];
    let idx = 1;

    if (filters.budget_min !== undefined) {
      conditions.push(`price_lakh >= $${idx++}`);
      values.push(filters.budget_min);
    }
    if (filters.budget_max !== undefined) {
      conditions.push(`price_lakh <= $${idx++}`);
      values.push(filters.budget_max);
    }
    if (filters.fuel_type) {
      conditions.push(`LOWER(fuel_type) = LOWER($${idx++})`);
      values.push(filters.fuel_type);
    }
    if (filters.body_type) {
      conditions.push(`LOWER(body_type) = LOWER($${idx++})`);
      values.push(filters.body_type);
    }
    if (filters.seats_min !== undefined) {
      conditions.push(`seats >= $${idx++}`);
      values.push(filters.seats_min);
    }
    if (filters.use_case) {
      conditions.push(`$${idx++} = ANY(use_case)`);
      values.push(filters.use_case);
    }
    if (filters.transmission) {
      conditions.push(`LOWER(transmission) = LOWER($${idx++})`);
      values.push(filters.transmission);
    }
    if (filters.safety_min !== undefined) {
      conditions.push(`safety_rating >= $${idx++}`);
      values.push(filters.safety_min);
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const limit = filters.limit ?? 50;
    const offset = filters.offset ?? 0;

    const countResult = await pool.query<{ count: string }>(
      `SELECT COUNT(*) FROM cars ${where}`,
      values
    );

    const dataResult = await pool.query<Car>(
      `SELECT * FROM cars ${where} ORDER BY user_rating DESC, review_count DESC
       LIMIT $${idx++} OFFSET $${idx++}`,
      [...values, limit, offset]
    );

    return {
      data: dataResult.rows,
      total: parseInt(countResult.rows[0].count, 10),
    };
  }

  async findById(id: number): Promise<Car | null> {
    const result = await pool.query<Car>('SELECT * FROM cars WHERE id = $1', [id]);
    return result.rows[0] ?? null;
  }
}

export const carsService = new CarsService();
