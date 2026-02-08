import { db } from '$lib/server/db/client';
import { tracks } from '$lib/server/db/schema';
import { eq, desc } from 'drizzle-orm';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
  const readyTracks = db
    .select({
      id: tracks.id,
      title: tracks.title,
      slug: tracks.slug,
      duration: tracks.duration,
      artPath: tracks.artPath,
      playCount: tracks.playCount,
      category: tracks.category,
      createdAt: tracks.createdAt,
    })
    .from(tracks)
    .where(eq(tracks.status, 'ready'))
    .orderBy(desc(tracks.createdAt))
    .all();

  return { tracks: readyTracks };
};
