import { pool } from '../../db/pool';

export class AnalyticsService {
  async getPopular(limit = 10): Promise<unknown[]> {
    const result = await pool.query(
      `SELECT id, make, model, variant, price_lakh, fuel_type, body_type,
              user_rating, review_count, image_url, safety_rating
       FROM cars
       ORDER BY review_count DESC, user_rating DESC
       LIMIT $1`,
      [limit]
    );
    return result.rows;
  }

  async getStats(): Promise<unknown> {
    const result = await pool.query(`
      SELECT
        COUNT(*)::int                                    AS total_cars,
        ROUND(AVG(price_lakh)::numeric, 2)              AS avg_price_lakh,
        MIN(price_lakh)                                 AS min_price_lakh,
        MAX(price_lakh)                                 AS max_price_lakh,
        ROUND(AVG(safety_rating)::numeric, 2)           AS avg_safety_rating,
        ROUND(AVG(user_rating)::numeric, 2)             AS avg_user_rating,
        SUM(review_count)::int                          AS total_reviews
      FROM cars
    `);

    const fuelResult = await pool.query(`
      SELECT fuel_type, COUNT(*)::int AS count
      FROM cars
      GROUP BY fuel_type
      ORDER BY count DESC
    `);

    const bodyResult = await pool.query(`
      SELECT body_type, COUNT(*)::int AS count
      FROM cars
      GROUP BY body_type
      ORDER BY count DESC
    `);

    const transmissionResult = await pool.query(`
      SELECT transmission, COUNT(*)::int AS count
      FROM cars
      GROUP BY transmission
      ORDER BY count DESC
    `);

    const budgetBuckets = await pool.query(`
      SELECT
        CASE
          WHEN price_lakh < 10  THEN 'under_10L'
          WHEN price_lakh < 20  THEN '10L_to_20L'
          WHEN price_lakh < 30  THEN '20L_to_30L'
          ELSE 'above_30L'
        END AS bucket,
        COUNT(*)::int AS count
      FROM cars
      GROUP BY bucket
      ORDER BY MIN(price_lakh)
    `);

    return {
      summary: result.rows[0],
      fuel_distribution: fuelResult.rows,
      body_type_distribution: bodyResult.rows,
      transmission_distribution: transmissionResult.rows,
      price_buckets: budgetBuckets.rows,
    };
  }
}

export const analyticsService = new AnalyticsService();
