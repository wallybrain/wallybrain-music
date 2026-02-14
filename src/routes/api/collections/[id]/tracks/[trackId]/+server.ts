import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db/client';
import { collections, collectionTracks, tracks } from '$lib/server/db/schema';
import { eq, and, sql } from 'drizzle-orm';

export const DELETE: RequestHandler = async ({ params }) => {
	const collection = db.select({ id: collections.id })
		.from(collections)
		.where(eq(collections.id, params.id))
		.get();

	if (!collection) throw error(404, 'Collection not found');

	db.delete(collectionTracks)
		.where(and(
			eq(collectionTracks.collectionId, params.id),
			eq(collectionTracks.trackId, params.trackId),
		))
		.run();

	// Recalculate aggregates
	const agg = db.select({
		count: sql<number>`count(*)`,
		totalDur: sql<number>`coalesce(sum(${tracks.duration}), 0)`,
	})
		.from(collectionTracks)
		.innerJoin(tracks, eq(collectionTracks.trackId, tracks.id))
		.where(eq(collectionTracks.collectionId, params.id))
		.get();

	db.update(collections)
		.set({
			trackCount: agg?.count ?? 0,
			totalDuration: agg?.totalDur ?? 0,
			updatedAt: new Date().toISOString(),
		})
		.where(eq(collections.id, params.id))
		.run();

	return json({ ok: true });
};
