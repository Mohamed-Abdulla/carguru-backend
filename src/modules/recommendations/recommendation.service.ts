import { pool } from '../../db/pool';
import { Car } from '../cars/cars.types';
import {
  RecommendationPreferences,
  ScoredCar,
  RecommendResult,
  ScoreBreakdown,
} from './recommendation.types';

// ─── Scoring weights ────────────────────────────────────────────────────────
const WEIGHTS = {
  budget: 25,
  safety: 18,
  userRating: 15,
  mileage: 12,
  useCase: 12,
  targetBuyer: 8,
  priorityBonus: 6,
  transmission: 4,
};
const MAX_SCORE = Object.values(WEIGHTS).reduce((a, b) => a + b, 0); // 100

// ─── Helpers ─────────────────────────────────────────────────────────────────

function normalize(value: number, min: number, max: number): number {
  if (max === min) return 1;
  return Math.min(1, Math.max(0, (value - min) / (max - min)));
}

function overlapScore(a: string[], b: string[], weight: number): number {
  if (!a?.length || !b?.length) return 0;
  const setB = new Set(b.map((x) => x.toLowerCase()));
  const matches = a.filter((x) => setB.has(x.toLowerCase())).length;
  return (matches / Math.max(a.length, b.length)) * weight;
}

/** Returns a zero-score ScoredCar with a disqualification reason */
function disqualify(car: Car, reason: string): ScoredCar {
  return {
    car,
    match_score: 0,
    match_reasons: [reason],
    score_breakdown: {
      budget_score: 0,
      safety_score: 0,
      rating_score: 0,
      mileage_score: 0,
      use_case_score: 0,
      target_buyer_score: 0,
      priority_bonus: 0,
      transmission_bonus: 0,
    },
  };
}

/** Normalise numeric fields that Postgres returns as strings */
function normalizeCar(car: Car): Car {
  return {
    ...car,
    price_lakh: parseFloat(car.price_lakh as unknown as string),
    mileage_kmpl:
      car.mileage_kmpl != null
        ? parseFloat(car.mileage_kmpl as unknown as string)
        : null,
    range_km:
      car.range_km != null
        ? parseFloat(car.range_km as unknown as string)
        : null,
    power_bhp: parseFloat(car.power_bhp as unknown as string),
    torque_nm: parseFloat(car.torque_nm as unknown as string),
    user_rating: parseFloat(car.user_rating as unknown as string),
    safety_rating: parseFloat(car.safety_rating as unknown as string),
    seats: parseInt(car.seats as unknown as string, 10),
    boot_space_litres: parseInt(car.boot_space_litres as unknown as string, 10),
    engine_cc:
      car.engine_cc != null
        ? parseInt(car.engine_cc as unknown as string, 10)
        : null,
    ground_clearance_mm: parseInt(
      car.ground_clearance_mm as unknown as string,
      10,
    ),
    service_cost_annual: parseFloat(
      car.service_cost_annual as unknown as string,
    ),
    warranty_years: parseFloat(car.warranty_years as unknown as string),
    review_count: parseInt(car.review_count as unknown as string, 10),
  };
}

// ─── Hard Filter Gate ─────────────────────────────────────────────────────────
// All hard filters are applied FIRST before any scoring.
// If any hard filter fails, the car is immediately disqualified.

function hardFilterCheck(
  car: Car,
  prefs: RecommendationPreferences,
): string | null {
  const budgetMin = prefs.budget_min ?? 0;
  const budgetMax = prefs.budget_max ?? Infinity;

  // 1. Budget max — strict ceiling
  if (car.price_lakh > budgetMax) {
    return `Over budget: ₹${car.price_lakh}L > ₹${budgetMax}L`;
  }

  // 2. Budget min — strict floor (user explicitly said "not too cheap")
  if (prefs.budget_min != null && car.price_lakh < budgetMin) {
    return `Under minimum budget: ₹${car.price_lakh}L < ₹${budgetMin}L`;
  }

  // 3. Fuel type — exact match required if specified
  if (prefs.fuel_type?.length) {
    const fuelMatch = prefs.fuel_type.some(
      (f) => f.toLowerCase() === car.fuel_type.toLowerCase(),
    );
    if (!fuelMatch) {
      return `Fuel type mismatch: car is ${car.fuel_type}, wanted ${prefs.fuel_type.join('/')}`;
    }
  }

  // 4. Body type — exact match required if specified
  if (prefs.body_type?.length) {
    const bodyMatch = prefs.body_type.some(
      (b) => b.toLowerCase() === car.body_type.toLowerCase(),
    );
    if (!bodyMatch) {
      return `Body type mismatch: car is ${car.body_type}, wanted ${prefs.body_type.join('/')}`;
    }
  }

  // 5. Minimum seats — car must have AT LEAST this many seats
  if (prefs.seats != null && prefs.seats > 0) {
    if (car.seats < prefs.seats) {
      return `Insufficient seats: car has ${car.seats}, wanted ≥${prefs.seats}`;
    }
  }

  // 6. Transmission — exact match required if specified
  if (prefs.transmission) {
    if (car.transmission.toLowerCase() !== prefs.transmission.toLowerCase()) {
      return `Transmission mismatch: car is ${car.transmission}, wanted ${prefs.transmission}`;
    }
  }

  return null; // passes all hard filters
}

// ─── Core Scoring Engine ──────────────────────────────────────────────────────

function scoreCar(car: Car, prefs: RecommendationPreferences): ScoredCar {
  // Gate: run all hard filters first
  const filterFailReason = hardFilterCheck(car, prefs);
  if (filterFailReason) {
    return disqualify(car, filterFailReason);
  }

  const reasons: string[] = [];
  const breakdown: ScoreBreakdown = {
    budget_score: 0,
    safety_score: 0,
    rating_score: 0,
    mileage_score: 0,
    use_case_score: 0,
    target_buyer_score: 0,
    priority_bonus: 0,
    transmission_bonus: 0,
  };

  // ── Budget score (car is guaranteed within range here) ────────────────────
  const budgetMin = prefs.budget_min ?? 0;
  const budgetMax = prefs.budget_max ?? Infinity;
  const rangeDenominator = isFinite(budgetMax)
    ? budgetMax - budgetMin + 0.01
    : 1;
  const budgetRoom = isFinite(budgetMax)
    ? (budgetMax - car.price_lakh) / rangeDenominator
    : 1;
  breakdown.budget_score = WEIGHTS.budget * (0.7 + 0.3 * budgetRoom);
  reasons.push(`Fits your budget (₹${car.price_lakh}L)`);

  // ── Safety ────────────────────────────────────────────────────────────────
  breakdown.safety_score = (car.safety_rating / 5) * WEIGHTS.safety;
  if (car.safety_rating >= 5) reasons.push(`5-star safety rating`);
  else if (car.safety_rating >= 4) reasons.push(`4-star safety rating`);

  // ── User rating ───────────────────────────────────────────────────────────
  breakdown.rating_score = normalize(car.user_rating, 3, 5) * WEIGHTS.userRating;
  if (car.user_rating >= 4.5) reasons.push(`Highly rated by users (${car.user_rating}★)`);
  else if (car.user_rating >= 4.0) reasons.push(`Well rated by users (${car.user_rating}★)`);

  // ── Mileage / range ───────────────────────────────────────────────────────
  const effectiveMileage =
    car.mileage_kmpl ?? (car.range_km ? car.range_km / 10 : 0);
  breakdown.mileage_score =
    normalize(effectiveMileage, 10, 30) * WEIGHTS.mileage;
  if (effectiveMileage >= 25)
    reasons.push(
      `Excellent fuel efficiency (${car.fuel_type === 'Electric' ? car.range_km + ' km range' : effectiveMileage + ' kmpl'})`,
    );
  else if (effectiveMileage >= 18) reasons.push(`Good fuel efficiency`);

  // ── Use case ──────────────────────────────────────────────────────────────
  if (prefs.use_case?.length) {
    const ucScore = overlapScore(car.use_case, prefs.use_case, WEIGHTS.useCase);
    breakdown.use_case_score = ucScore;
    const matches = car.use_case.filter((uc) =>
      prefs.use_case!.map((x) => x.toLowerCase()).includes(uc.toLowerCase()),
    );
    if (matches.length) reasons.push(`Great for: ${matches.join(', ')}`);
  } else {
    // No use_case filter — give full points so it doesn't penalise
    breakdown.use_case_score = WEIGHTS.useCase;
  }

  // ── Target buyer ──────────────────────────────────────────────────────────
  if (prefs.target_buyer?.length) {
    const tbScore = overlapScore(
      car.target_buyer,
      prefs.target_buyer,
      WEIGHTS.targetBuyer,
    );
    breakdown.target_buyer_score = tbScore;
    if (tbScore > 0) reasons.push(`Matches your buyer profile`);
  } else {
    breakdown.target_buyer_score = WEIGHTS.targetBuyer;
  }

  // ── Transmission score (bonus since hard filter already passed) ───────────
  if (prefs.transmission) {
    // Guaranteed match due to hard filter gate — full bonus
    breakdown.transmission_bonus = WEIGHTS.transmission;
    reasons.push(`${car.transmission} transmission as preferred`);
  } else {
    // No preference — neutral score (don't penalise)
    breakdown.transmission_bonus = WEIGHTS.transmission;
  }

  // ── Priority bonuses ──────────────────────────────────────────────────────
  if (prefs.priorities?.length) {
    let bonus = 0;
    const perPriority = WEIGHTS.priorityBonus / prefs.priorities.length;
    for (const priority of prefs.priorities) {
      switch (priority.toLowerCase()) {
        case 'safety':
          if (car.safety_rating >= 4) {
            bonus += perPriority;
            reasons.push(`Prioritized: best-in-class safety`);
          }
          break;
        case 'mileage':
          if (effectiveMileage >= 20) {
            bonus += perPriority;
            reasons.push(`Prioritized: high mileage`);
          }
          break;
        case 'price':
        case 'budget':
        case 'value':
          if (isFinite(budgetMax) && car.price_lakh <= budgetMax * 0.85) {
            bonus += perPriority;
            reasons.push(`Prioritized: great value for money`);
          } else if (!isFinite(budgetMax)) {
            bonus += perPriority * 0.5;
          }
          break;
        case 'power':
        case 'performance':
          if (car.power_bhp >= 120) {
            bonus += perPriority;
            reasons.push(`Prioritized: high performance`);
          }
          break;
        case 'space':
        case 'boot':
          if (car.boot_space_litres >= 400) {
            bonus += perPriority;
            reasons.push(`Prioritized: spacious boot`);
          }
          break;
        case 'comfort':
          if (car.seats >= 7) {
            bonus += perPriority;
            reasons.push(`Prioritized: comfort seating`);
          }
          break;
      }
    }
    breakdown.priority_bonus = bonus;
  }

  const rawScore = Object.values(breakdown).reduce((a, b) => a + b, 0);
  const matchScore = Math.round(Math.min(100, (rawScore / MAX_SCORE) * 100));

  return {
    car,
    match_score: matchScore,
    match_reasons: [...new Set(reasons)], // dedupe
    score_breakdown: breakdown,
  };
}

// ─── Service ─────────────────────────────────────────────────────────────────

export class RecommendationService {
  async recommend(prefs: RecommendationPreferences): Promise<RecommendResult> {
    const topN = prefs.top_n ?? 5;

    // Fetch all cars — dataset is small, no need to pre-filter in SQL
    const { rows: allCars } = await pool.query<Car>(
      'SELECT * FROM cars ORDER BY id ASC',
    );

    // Score every car (normalise types first, then hard filters applied inside scoreCar)
    const scored: ScoredCar[] = allCars
      .map((car) => scoreCar(normalizeCar(car), prefs))
      .filter((sc) => sc.match_score > 0) // exclude disqualified cars (hard filter failures)
      .sort((a, b) => b.match_score - a.match_score)
      .slice(0, topN);

    return {
      recommendations: scored,
      preferences_used: prefs,
      total_evaluated: allCars.length,
    };
  }

  async getSessionRecommendations(
    sessionId: string,
  ): Promise<RecommendResult | null> {
    const { rows } = await pool.query(
      'SELECT preferences FROM sessions WHERE id = $1',
      [sessionId],
    );
    if (!rows[0]) return null;
    const prefs: RecommendationPreferences = rows[0].preferences;
    return this.recommend(prefs);
  }
}

export const recommendationService = new RecommendationService();
