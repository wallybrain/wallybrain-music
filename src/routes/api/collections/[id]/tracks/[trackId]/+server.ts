import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db/client';
import { collections, collectionTracks } from '$lib/server/db/schema';
import { eq, and } from 'drizzle-orm';
import { recalcCollectionAggregates } from '$lib/server/db/helpers';

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

	recalcCollectionAggregates(params.id);

	return json({ ok: true });
};
