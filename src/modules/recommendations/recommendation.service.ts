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

// ─── Core engine ──────────────────────────────────────────────────────────────

function scoreCar(car: Car, prefs: RecommendationPreferences): ScoredCar {
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

  // ── Budget ────────────────────────────────────────────────────────────────
  const budgetMin = prefs.budget_min ?? 0;
  const budgetMax = prefs.budget_max ?? 100;

  if (car.price_lakh >= budgetMin && car.price_lakh <= budgetMax) {
    // Full points if within budget — bonus if well within budget
    const budgetRoom = (budgetMax - car.price_lakh) / (budgetMax - budgetMin + 0.01);
    breakdown.budget_score = WEIGHTS.budget * (0.7 + 0.3 * budgetRoom);
    reasons.push(`Fits your budget (₹${car.price_lakh}L)`);
  } else if (car.price_lakh <= budgetMax * 1.1) {
    // Slightly over budget — partial score
    breakdown.budget_score = WEIGHTS.budget * 0.3;
    reasons.push(`Slightly over budget but worth considering`);
  } else {
    breakdown.budget_score = 0;
  }

  // ── Safety ────────────────────────────────────────────────────────────────
  breakdown.safety_score = (car.safety_rating / 5) * WEIGHTS.safety;
  if (car.safety_rating >= 5) reasons.push(`5-star safety rating`);
  else if (car.safety_rating >= 4) reasons.push(`4-star safety rating`);

  // ── User rating ───────────────────────────────────────────────────────────
  breakdown.rating_score = normalize(car.user_rating, 3, 5) * WEIGHTS.userRating;
  if (car.user_rating >= 4.5) reasons.push(`Highly rated by users (${car.user_rating}★)`);
  else if (car.user_rating >= 4.0) reasons.push(`Well rated by users (${car.user_rating}★)`);

  // ── Mileage / range ───────────────────────────────────────────────────────
  const effectiveMileage = car.mileage_kmpl ?? (car.range_km ? car.range_km / 10 : 0);
  breakdown.mileage_score = normalize(effectiveMileage, 10, 30) * WEIGHTS.mileage;
  if (effectiveMileage >= 25) reasons.push(`Excellent fuel efficiency (${car.fuel_type === 'Electric' ? car.range_km + ' km range' : effectiveMileage + ' kmpl'})`);
  else if (effectiveMileage >= 18) reasons.push(`Good fuel efficiency`);

  // ── Use case ──────────────────────────────────────────────────────────────
  if (prefs.use_case?.length) {
    const ucScore = overlapScore(car.use_case, prefs.use_case, WEIGHTS.useCase);
    breakdown.use_case_score = ucScore;
    const matches = car.use_case.filter((uc) =>
      prefs.use_case!.map((x) => x.toLowerCase()).includes(uc.toLowerCase())
    );
    if (matches.length) reasons.push(`Great for: ${matches.join(', ')}`);
  }

  // ── Target buyer ──────────────────────────────────────────────────────────
  if (prefs.target_buyer?.length) {
    const tbScore = overlapScore(car.target_buyer, prefs.target_buyer, WEIGHTS.targetBuyer);
    breakdown.target_buyer_score = tbScore;
    if (tbScore > 0) reasons.push(`Matches your buyer profile`);
  }

  // ── Priority bonuses ──────────────────────────────────────────────────────
  if (prefs.priorities?.length) {
    let bonus = 0;
    const perPriority = WEIGHTS.priorityBonus / prefs.priorities.length;
    for (const priority of prefs.priorities) {
      switch (priority.toLowerCase()) {
        case 'safety':
          if (car.safety_rating >= 4) { bonus += perPriority; reasons.push(`Prioritized: safety`); }
          break;
        case 'mileage':
          if (effectiveMileage >= 20) { bonus += perPriority; reasons.push(`Prioritized: mileage`); }
          break;
        case 'price':
        case 'budget':
          if (car.price_lakh <= (prefs.budget_max ?? 100) * 0.85) {
            bonus += perPriority;
            reasons.push(`Prioritized: value for money`);
          }
          break;
        case 'power':
        case 'performance':
          if (car.power_bhp >= 120) { bonus += perPriority; reasons.push(`Prioritized: performance`); }
          break;
        case 'space':
        case 'boot':
          if (car.boot_space_litres >= 400) { bonus += perPriority; reasons.push(`Prioritized: spaciousness`); }
          break;
        case 'comfort':
          if (car.seats >= 7) { bonus += perPriority; reasons.push(`Prioritized: comfort`); }
          break;
      }
    }
    breakdown.priority_bonus = bonus;
  }

  // ── Transmission ──────────────────────────────────────────────────────────
  if (
    prefs.transmission &&
    car.transmission.toLowerCase() === prefs.transmission.toLowerCase()
  ) {
    breakdown.transmission_bonus = WEIGHTS.transmission;
    reasons.push(`${car.transmission} transmission as preferred`);
  }

  // ── Fuel type hard filter ────────────────────────────────────────────────
  if (prefs.fuel_type?.length) {
    const fuelMatch = prefs.fuel_type.some(
      (f) => f.toLowerCase() === car.fuel_type.toLowerCase()
    );
    if (!fuelMatch) {
      // Zero out — won't appear in top results as score collapses
      Object.keys(breakdown).forEach((k) => {
        (breakdown as unknown as Record<string, number>)[k] = 0;
      });
      reasons.length = 0;
      reasons.push('Fuel type mismatch');
    }
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

    // Fetch all cars — dataset is small (35), no need to pre-filter in SQL
    const { rows: allCars } = await pool.query<Car>(
      'SELECT * FROM cars ORDER BY id ASC'
    );

    // Score every car
    const scored: ScoredCar[] = allCars
      .map((car) => scoreCar(car, prefs))
      .filter((sc) => sc.match_score > 10) // prune clearly irrelevant cars
      .sort((a, b) => b.match_score - a.match_score)
      .slice(0, topN);

    return {
      recommendations: scored,
      preferences_used: prefs,
      total_evaluated: allCars.length,
    };
  }

  async getSessionRecommendations(sessionId: string): Promise<RecommendResult | null> {
    // Load session preferences and run recommendation
    const { rows } = await pool.query(
      'SELECT preferences FROM sessions WHERE id = $1',
      [sessionId]
    );
    if (!rows[0]) return null;
    const prefs: RecommendationPreferences = rows[0].preferences;
    return this.recommend(prefs);
  }
}

export const recommendationService = new RecommendationService();
