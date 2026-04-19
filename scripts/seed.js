#!/usr/bin/env node
/**
 * seed.js — Seeds cars_dataset.json into PostgreSQL.
 * Runs automatically in Docker CMD; also callable via `npm run seed`.
 * Idempotent: uses INSERT ... ON CONFLICT DO NOTHING.
 */

'use strict';

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  database: process.env.DB_NAME || 'carguru',
  user: process.env.DB_USER || 'carguru_user',
  password: process.env.DB_PASSWORD || 'carguru_pass',
  connectionTimeoutMillis: 5000,
});

async function waitForDb(retries = 10, delayMs = 2000) {
  for (let i = 0; i < retries; i++) {
    try {
      await pool.query('SELECT 1');
      return;
    } catch {
      console.log(`[seed] Waiting for DB... attempt ${i + 1}/${retries}`);
      await new Promise((r) => setTimeout(r, delayMs));
    }
  }
  throw new Error('Could not connect to the database after multiple retries');
}

async function seed() {
  await waitForDb();

  const datasetPath = path.join(__dirname, '..', 'cars_dataset.json');
  const raw = fs.readFileSync(datasetPath, 'utf-8');
  const cars = JSON.parse(raw);

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    let inserted = 0;
    let skipped = 0;

    for (const car of cars) {
      const res = await client.query(
        `INSERT INTO cars (
          id, make, model, variant, year, price_lakh, fuel_type, transmission,
          body_type, seats, mileage_kmpl, range_km, engine_cc, power_bhp,
          torque_nm, safety_rating, boot_space_litres, ground_clearance_mm,
          use_case, target_buyer, pros, cons, user_rating, review_count,
          image_url, colors, warranty_years, service_cost_annual
        ) VALUES (
          $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,
          $15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26,$27,$28
        )
        ON CONFLICT (id) DO NOTHING`,
        [
          car.id,
          car.make,
          car.model,
          car.variant,
          car.year,
          car.price_lakh,
          car.fuel_type,
          car.transmission,
          car.body_type,
          car.seats,
          car.mileage_kmpl ?? null,
          car.range_km ?? null,
          car.engine_cc ?? null,
          car.power_bhp,
          car.torque_nm,
          car.safety_rating,
          car.boot_space_litres,
          car.ground_clearance_mm,
          car.use_case,
          car.target_buyer,
          car.pros,
          car.cons,
          car.user_rating,
          car.review_count,
          car.image_url ?? null,
          car.colors,
          car.warranty_years,
          car.service_cost_annual,
        ]
      );
      res.rowCount > 0 ? inserted++ : skipped++;
    }

    await client.query('COMMIT');
    console.log(`[seed] ✓ Done — inserted: ${inserted}, skipped (already exists): ${skipped}`);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[seed] ✗ Failed:', err.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

seed();
