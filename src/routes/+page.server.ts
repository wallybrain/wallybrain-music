import { db } from '$lib/server/db/client';
import { collections, socialLinks } from '$lib/server/db/schema';
import { asc, desc } from 'drizzle-orm';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ parent }) => {
  const allCollections = db
    .select()
    .from(collections)
    .orderBy(asc(collections.sortOrder), desc(collections.createdAt))
    .all();

  const links = db
    .select()
    .from(socialLinks)
    .orderBy(asc(socialLinks.displayOrder))
    .all();

  const { isAuthenticated } = await parent();

  return { collections: allCollections, socialLinks: links, canEdit: isAuthenticated };
};
