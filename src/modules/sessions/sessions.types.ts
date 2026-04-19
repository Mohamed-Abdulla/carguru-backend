export interface SessionPreferences {
  budget_min?: number;
  budget_max?: number;
  fuel_type?: string[];
  body_type?: string[];
  seats?: number;
  use_case?: string[];
  priorities?: string[]; // e.g. ["safety", "mileage", "price"]
  transmission?: string;
  target_buyer?: string[];
}

export interface Session {
  id: string;
  preferences: SessionPreferences;
  shortlist: number[]; // car IDs
  messages: SessionMessage[];
  created_at: Date;
  updated_at: Date;
}

export interface SessionMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

export interface CreateSessionDto {
  preferences?: SessionPreferences;
}

export interface UpdateSessionDto {
  preferences?: Partial<SessionPreferences>;
  shortlist?: number[];
  messages?: SessionMessage[];
}
