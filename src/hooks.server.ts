import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { db } from '$lib/server/db/client';
import { startQueueProcessor } from '$lib/server/queue';

migrate(db, { migrationsFolder: './drizzle' });
startQueueProcessor();
