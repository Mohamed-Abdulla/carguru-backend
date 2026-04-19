import { Car } from '../cars/cars.types';
import { SessionPreferences } from '../sessions/sessions.types';

export interface RecommendationPreferences extends SessionPreferences {
  top_n?: number; // how many cars to return, default 5
}

export interface ScoredCar {
  car: Car;
  match_score: number;       // 0–100
  match_reasons: string[];   // human-readable explanations
  score_breakdown: ScoreBreakdown;
}

export interface ScoreBreakdown {
  budget_score: number;
  safety_score: number;
  rating_score: number;
  mileage_score: number;
  use_case_score: number;
  target_buyer_score: number;
  priority_bonus: number;
  transmission_bonus: number;
}

export interface RecommendResult {
  recommendations: ScoredCar[];
  preferences_used: RecommendationPreferences;
  total_evaluated: number;
}
