import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db/client';
import { collections, collectionTracks } from '$lib/server/db/schema';
import { eq, and } from 'drizzle-orm';

export const PATCH: RequestHandler = async ({ request, params }) => {
	const collection = db.select({ id: collections.id })
		.from(collections)
		.where(eq(collections.id, params.id))
		.get();

	if (!collection) throw error(404, 'Collection not found');

	const { positions } = await request.json();

	if (!Array.isArray(positions)) {
		return json({ error: 'positions must be an array of {trackId, position}' }, { status: 400 });
	}

	for (const { trackId, position } of positions) {
		db.update(collectionTracks)
			.set({ position })
			.where(and(
				eq(collectionTracks.collectionId, params.id),
				eq(collectionTracks.trackId, trackId),
			))
			.run();
	}

	return json({ ok: true });
};
