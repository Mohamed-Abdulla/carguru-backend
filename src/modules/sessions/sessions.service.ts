import { pool } from '../../db/pool';
import { Session, CreateSessionDto, UpdateSessionDto } from './sessions.types';

export class SessionsService {
  async create(dto: CreateSessionDto): Promise<Session> {
    const result = await pool.query<Session>(
      `INSERT INTO sessions (preferences, shortlist, messages)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [
        JSON.stringify(dto.preferences ?? {}),
        JSON.stringify([]),
        JSON.stringify([]),
      ]
    );
    return result.rows[0];
  }

  async findById(id: string): Promise<Session | null> {
    const result = await pool.query<Session>(
      'SELECT * FROM sessions WHERE id = $1',
      [id]
    );
    return result.rows[0] ?? null;
  }

  async update(id: string, dto: UpdateSessionDto): Promise<Session | null> {
    // Build a JSONB merge update — each field is optional
    const setParts: string[] = [];
    const values: unknown[] = [];
    let idx = 1;

    if (dto.preferences !== undefined) {
      // Deep merge existing preferences with the patch
      setParts.push(`preferences = preferences || $${idx++}::jsonb`);
      values.push(JSON.stringify(dto.preferences));
    }

    if (dto.shortlist !== undefined) {
      setParts.push(`shortlist = $${idx++}`);
      values.push(JSON.stringify(dto.shortlist));
    }

    if (dto.messages !== undefined) {
      // Append new messages to the existing JSONB array
      setParts.push(`messages = messages || $${idx++}::jsonb`);
      values.push(JSON.stringify(dto.messages));
    }

    if (setParts.length === 0) return this.findById(id);

    setParts.push(`updated_at = NOW()`);
    values.push(id);

    const result = await pool.query<Session>(
      `UPDATE sessions SET ${setParts.join(', ')} WHERE id = $${idx} RETURNING *`,
      values
    );

    return result.rows[0] ?? null;
  }
}

export const sessionsService = new SessionsService();
