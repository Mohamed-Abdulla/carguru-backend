export interface Car {
  id: number;
  make: string;
  model: string;
  variant: string;
  year: number;
  price_lakh: number;
  fuel_type: string;
  transmission: string;
  body_type: string;
  seats: number;
  mileage_kmpl: number | null;
  range_km: number | null;
  engine_cc: number | null;
  power_bhp: number;
  torque_nm: number;
  safety_rating: number;
  boot_space_litres: number;
  ground_clearance_mm: number;
  use_case: string[];
  target_buyer: string[];
  pros: string[];
  cons: string[];
  user_rating: number;
  review_count: number;
  image_url: string;
  colors: string[];
  warranty_years: number;
  service_cost_annual: number;
  created_at?: Date;
}

export interface CarFilters {
  budget_min?: number;
  budget_max?: number;
  fuel_type?: string;
  body_type?: string;
  seats_min?: number;
  use_case?: string;
  transmission?: string;
  safety_min?: number;
  limit?: number;
  offset?: number;
}
