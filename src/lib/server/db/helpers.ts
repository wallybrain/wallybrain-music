import { db } from './client';
import { tracks, collectionTracks, collections } from './schema';
import { eq, sql } from 'drizzle-orm';

export function recalcCollectionAggregates(collectionId: string) {
	const agg = db.select({
		count: sql<number>`count(*)`,
		totalDur: sql<number>`coalesce(sum(${tracks.duration}), 0)`,
	})
		.from(collectionTracks)
		.innerJoin(tracks, eq(collectionTracks.trackId, tracks.id))
		.where(eq(collectionTracks.collectionId, collectionId))
		.get();

	db.update(collections)
		.set({
			trackCount: agg?.count ?? 0,
			totalDuration: agg?.totalDur ?? 0,
			updatedAt: new Date().toISOString(),
		})
		.where(eq(collections.id, collectionId))
		.run();
}
