import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db/client';
import { collections, collectionTracks } from '$lib/server/db/schema';
import { eq, and, max, ne } from 'drizzle-orm';
import { existsSync, unlinkSync } from 'node:fs';

export const POST: RequestHandler = async ({ request, params }) => {
	const body = await request.json();
	const { trackId, position } = body;

	if (!trackId) {
		return json({ error: 'trackId is required' }, { status: 400 });
	}

	const collection = db.select({ id: collections.id, type: collections.type })
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

	// When adding a track to an album/playlist, remove any auto-created single collection
	if (collection.type !== 'single') {
		const singleCollections = db.select({ id: collections.id, artPath: collections.artPath })
			.from(collections)
			.innerJoin(collectionTracks, eq(collectionTracks.collectionId, collections.id))
			.where(and(
				eq(collectionTracks.trackId, trackId),
				eq(collections.type, 'single'),
				ne(collections.id, params.id),
			))
			.all();

		for (const single of singleCollections) {
			db.delete(collections).where(eq(collections.id, single.id)).run();
			const artPath = `/data/art/collections/${single.id}.jpg`;
			try { if (existsSync(artPath)) unlinkSync(artPath); } catch { /* already gone */ }
		}
	}

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
