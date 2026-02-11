import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db/client';
import { collections, collectionTracks } from '$lib/server/db/schema';
import { eq, max } from 'drizzle-orm';

export const POST: RequestHandler = async ({ request, params }) => {
	const body = await request.json();
	const { trackId, position } = body;

	if (!trackId) {
		return json({ error: 'trackId is required' }, { status: 400 });
	}

	const collection = db.select({ id: collections.id })
		.from(collections)
		.where(eq(collections.id, params.id))
		.get();

	if (!collection) {
		return json({ error: 'Collection not found' }, { status: 404 });
	}

	let finalPosition = position;
	if (finalPosition == null) {
		const result = db.select({ maxPos: max(collectionTracks.position) })
			.from(collectionTracks)
			.where(eq(collectionTracks.collectionId, params.id))
			.get();
		finalPosition = (result?.maxPos ?? -1) + 1;
	}

	db.insert(collectionTracks).values({
		collectionId: params.id,
		trackId,
		position: finalPosition,
	}).onConflictDoNothing().run();

	// Update denormalized track count
	const countResult = db.select({ count: max(collectionTracks.position) })
		.from(collectionTracks)
		.where(eq(collectionTracks.collectionId, params.id))
		.get();

	// Count actual rows for accuracy
	const rows = db.select({ trackId: collectionTracks.trackId })
		.from(collectionTracks)
		.where(eq(collectionTracks.collectionId, params.id))
		.all();

	db.update(collections)
		.set({ trackCount: rows.length, updatedAt: new Date().toISOString() })
		.where(eq(collections.id, params.id))
		.run();

	return json({ position: finalPosition }, { status: 201 });
};
