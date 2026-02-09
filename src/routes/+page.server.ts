import { db } from '$lib/server/db/client';
import { tracks, tags, trackTags } from '$lib/server/db/schema';
import { eq, and, exists, desc, sql, type SQL } from 'drizzle-orm';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ url }) => {
  const category = url.searchParams.get('category');
  const selectedTags = url.searchParams.getAll('tag');

  const filters: SQL[] = [eq(tracks.status, 'ready')];

  if (category) {
    filters.push(eq(tracks.category, category));
  }

  if (selectedTags.length > 0) {
    for (const tagName of selectedTags) {
      const sq = db
        .select({ x: sql`1` })
        .from(trackTags)
        .innerJoin(tags, eq(trackTags.tagId, tags.id))
        .where(and(eq(trackTags.trackId, tracks.id), eq(tags.name, tagName)));
      filters.push(exists(sq));
    }
  }

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
    .where(and(...filters))
    .orderBy(desc(tracks.createdAt))
    .all();

  const trackIds = readyTracks.map(t => t.id);
  const allTrackTags = trackIds.length > 0
    ? db.select({ trackId: trackTags.trackId, name: tags.name })
        .from(trackTags)
        .innerJoin(tags, eq(trackTags.tagId, tags.id))
        .all()
    : [];

  const tagsByTrack = new Map<string, string[]>();
  for (const tt of allTrackTags) {
    if (!tagsByTrack.has(tt.trackId)) tagsByTrack.set(tt.trackId, []);
    tagsByTrack.get(tt.trackId)!.push(tt.name);
  }

  const availableTags = db
    .select({ name: tags.name })
    .from(tags)
    .innerJoin(trackTags, eq(tags.id, trackTags.tagId))
    .innerJoin(tracks, eq(trackTags.trackId, tracks.id))
    .where(eq(tracks.status, 'ready'))
    .groupBy(tags.name)
    .all()
    .map(t => t.name);

  return {
    tracks: readyTracks.map(t => ({
      ...t,
      tags: tagsByTrack.get(t.id) ?? [],
    })),
    availableTags,
    activeCategory: category,
    activeTags: selectedTags,
  };
};
