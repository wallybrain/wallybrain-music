import { db } from '$lib/server/db/client';
import { sql } from 'drizzle-orm';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async () => {
  try {
    db.run(sql`SELECT 1`);
    return new Response('OK', { status: 200 });
  } catch {
    return new Response('Database unreachable', { status: 503 });
  }
};
