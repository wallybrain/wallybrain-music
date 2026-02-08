import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { db } from '$lib/server/db/client';

migrate(db, { migrationsFolder: './drizzle' });
