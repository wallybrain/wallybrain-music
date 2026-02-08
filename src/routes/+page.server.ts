import { db } from '$lib/server/db/client';
import { tracks } from '$lib/server/db/schema';
import { eq, count } from 'drizzle-orm';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
  const result = db
    .select({ value: count() })
    .from(tracks)
    .where(eq(tracks.status, 'ready'))
    .get();

  return { trackCount: result?.value ?? 0 };
};
