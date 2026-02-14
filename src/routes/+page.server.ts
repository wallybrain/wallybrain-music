import { db } from '$lib/server/db/client';
import { collections } from '$lib/server/db/schema';
import { desc } from 'drizzle-orm';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
  const allCollections = db
    .select()
    .from(collections)
    .orderBy(desc(collections.createdAt))
    .all();

  return { collections: allCollections };
};
