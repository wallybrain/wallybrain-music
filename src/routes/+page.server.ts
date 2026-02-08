import { db } from '$lib/server/db/client';
import { tracks } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
  const readyTracks = db
    .select({
      id: tracks.id,
      title: tracks.title,
      slug: tracks.slug,
      duration: tracks.duration,
      status: tracks.status,
    })
    .from(tracks)
    .where(eq(tracks.status, 'ready'))
    .all();

  return { tracks: readyTracks };
};
