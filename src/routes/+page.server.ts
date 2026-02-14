import { db } from '$lib/server/db/client';
import { tracks, tags, trackTags, collections, collectionTracks } from '$lib/server/db/schema';
import { eq, and, exists, desc, sql, notExists, type SQL } from 'drizzle-orm';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ url }) => {
  const category = url.searchParams.has('category') ? url.searchParams.get('category') || null : 'album';
  const selectedTags = url.searchParams.getAll('tag');

  // "album" and "playlist" filters show collections, not individual tracks
  const isCollectionFilter = category === 'album' || category === 'playlist';

  // Fetch collections (filtered by type when applicable)
  let filteredCollections: typeof allCollections = [];
  const allCollections = db
    .select()
    .from(collections)
    .orderBy(desc(collections.createdAt))
    .all();

  if (isCollectionFilter) {
    filteredCollections = allCollections.filter(c => c.type === category);
  } else if (!category) {
    // "All" — show all collections
    filteredCollections = allCollections;
  }
  // Other category filters (track/set/experiment/export) — no collections shown

  // Fetch standalone tracks (not in any collection), filtered by category
  const filters: SQL[] = [eq(tracks.status, 'ready')];

  // Exclude tracks that belong to a collection
  const inCollectionSq = db
    .select({ x: sql`1` })
    .from(collectionTracks)
    .where(eq(collectionTracks.trackId, tracks.id));
  filters.push(notExists(inCollectionSq));

  // For collection filters, don't show individual tracks
  if (isCollectionFilter) {
    // No standalone tracks shown when filtering by album/playlist
  } else if (category) {
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

  // Only query tracks if not a pure collection filter
  const readyTracks = isCollectionFilter ? [] : db
    .select({
      id: tracks.id,
      title: tracks.title,
      slug: tracks.slug,
      duration: tracks.duration,
      artPath: tracks.artPath,
      playCount: tracks.playCount,
      category: tracks.category,
      dominantColor: tracks.dominantColor,
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

  // Build collection art fallback for tracks without their own art
  const collectionArtRows = db.select({
      trackId: collectionTracks.trackId,
      artPath: collections.artPath,
      dominantColor: collections.dominantColor,
    })
    .from(collectionTracks)
    .innerJoin(collections, eq(collectionTracks.collectionId, collections.id))
    .all();

  const collectionArtMap = new Map<string, { artPath: string; dominantColor: string | null }>();
  for (const row of collectionArtRows) {
    if (row.artPath && !collectionArtMap.has(row.trackId)) {
      collectionArtMap.set(row.trackId, { artPath: row.artPath, dominantColor: row.dominantColor });
    }
  }

  return {
    tracks: readyTracks.map(t => {
      const fallback = !t.artPath ? collectionArtMap.get(t.id) : null;
      return {
        ...t,
        artPath: t.artPath ?? fallback?.artPath ?? null,
        dominantColor: t.dominantColor ?? fallback?.dominantColor ?? null,
        tags: tagsByTrack.get(t.id) ?? [],
      };
    }),
    collections: filteredCollections,
    availableTags,
    activeCategory: category,
    activeTags: selectedTags,
  };
};
