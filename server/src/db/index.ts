import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema.js';
import { config } from '../config/index.js';

let db: ReturnType<typeof drizzle> | null = null;

export function getDb() {
  if (!db) {
    if (!config.database.url) {
      console.warn('[Database] DATABASE_URL not set, database features disabled');
      return null;
    }
    const queryClient = postgres(config.database.url, { max: 10 });
    db = drizzle(queryClient, { schema });
    console.log('[Database] Connected to PostgreSQL');
  }
  return db;
}

// Export schema for use elsewhere
export * from './schema.js';
